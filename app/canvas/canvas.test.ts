namespace $ {

	/**
	 * What the canvas does with the geometry `$bog_figmol_magnet` works out: which
	 * gesture asks about which edges, what it does with the answer, and what the
	 * guides end up saying. The arithmetic itself is checked over there.
	 *
	 * Everything a press would have measured off the screen is set here by hand —
	 * that is exactly the split the plain gesture fields were introduced for.
	 */
	$mol_test({

		'a drag sticks to a neighbour and puts up a guide'() {

			const canvas = new $bog_figmol_app_canvas as $.$$.$bog_figmol_app_canvas

			canvas.grab_box = [ 100, 100, 50, 50 ]
			canvas.grab_lines_x = [ 200 ]
			canvas.grab_lines_y = []
			canvas.grab_limit = 6

			// Asked for 96, which leaves the left edge four pixels short of 200.
			$mol_assert_like( canvas.snap_move( 96, 0 ), [ 100, 0 ] )

			$mol_assert_equal( canvas.guide_x(), 200 )
			$mol_assert_equal( canvas.guide_y(), null )

		},

		'a drag that lands nowhere near anything keeps the guides down'() {

			const canvas = new $bog_figmol_app_canvas as $.$$.$bog_figmol_app_canvas

			canvas.grab_box = [ 100, 100, 50, 50 ]
			canvas.grab_lines_x = [ 200 ]
			canvas.grab_lines_y = []
			canvas.grab_limit = 6

			$mol_assert_like( canvas.snap_move( 40, 0 ), [ 40, 0 ] )
			$mol_assert_equal( canvas.guide_x(), null )

		},

		/** Inside an auto layout there is nothing to stick to, and the lists say so. */
		'a drag with nothing armed to stick to moves exactly as asked'() {

			const canvas = new $bog_figmol_app_canvas as $.$$.$bog_figmol_app_canvas

			canvas.grab_box = [ 100, 100, 50, 50 ]
			canvas.grab_limit = 6

			$mol_assert_like( canvas.snap_move( 3, 3 ), [ 3, 3 ] )

		},

		'a resize sticks by the edge it is dragging and leaves the other one'() {

			const canvas = new $bog_figmol_app_canvas as $.$$.$bog_figmol_app_canvas

			canvas.grab_lines_x = [ 300, 100 ]
			canvas.grab_lines_y = []
			canvas.grab_limit = 6

			$mol_assert_like( canvas.snap_edges( [ 104, 100, 193, 50 ], 'e' ), [ 104, 100, 196, 50 ] )
			$mol_assert_equal( canvas.guide_x(), 300 )
			$mol_assert_equal( canvas.guide_y(), null )

		},

		'a west grip moves the left edge and the width together'() {

			const canvas = new $bog_figmol_app_canvas as $.$$.$bog_figmol_app_canvas

			canvas.grab_lines_x = [ 100 ]
			canvas.grab_lines_y = []
			canvas.grab_limit = 6

			$mol_assert_like( canvas.snap_edges( [ 104, 100, 96, 50 ], 'w' ), [ 100, 100, 100, 50 ] )

		},

		/** Sticking to a neighbour is worth less than the size it would eat. */
		'a snap that would squeeze the box past its floor is dropped'() {

			const canvas = new $bog_figmol_app_canvas as $.$$.$bog_figmol_app_canvas

			canvas.grab_lines_x = [ 104 ]
			canvas.grab_lines_y = []
			canvas.grab_limit = 6

			$mol_assert_like( canvas.snap_edges( [ 100, 100, 10, 50 ], 'w' ), [ 100, 100, 10, 50 ] )
			$mol_assert_equal( canvas.guide_x(), null )

		},

		/**
		 * A group is stretched rather than resized element by element: everything
		 * inside keeps its place and its size as a share of the frame around it.
		 */
		'a group scales about the corner opposite the grip'() {

			const canvas = new $bog_figmol_app_canvas as $.$$.$bog_figmol_app_canvas

			canvas.grab_ids = [ 'a', 'b' ]
			canvas.grab_box = [ 0, 0, 200, 100 ]
			canvas.grab_corner = 'se'
			canvas.grab_rects = { a: [ 0, 0, 100, 100 ], b: [ 100, 0, 100, 100 ] }
			canvas.grab_sheets = { a: [ 0, 0 ], b: [ 100, 0 ] }
			canvas.grab_limit = 6

			canvas.scale_move( 200, 0 )

			$mol_assert_like( canvas.draft(), {
				a: [ 0, 0, 200, 100 ],
				b: [ 200, 0, 200, 100 ],
			} )

			// The frame follows the gesture instead of being measured again.
			$mol_assert_like( canvas.group_box(), [ 0, 0, 400, 100 ] )

		},

		'a north-west grip keeps the far corner of the group where it is'() {

			const canvas = new $bog_figmol_app_canvas as $.$$.$bog_figmol_app_canvas

			canvas.grab_ids = [ 'a' ]
			canvas.grab_box = [ 100, 100, 200, 100 ]
			canvas.grab_corner = 'nw'
			canvas.grab_rects = { a: [ 100, 100, 200, 100 ] }
			canvas.grab_sheets = { a: [ 100, 100 ] }
			canvas.grab_limit = 6

			canvas.scale_move( 100, 50 )

			$mol_assert_like( canvas.draft(), { a: [ 200, 150, 100, 50 ] } )

		},

		/**
		 * The drop is written from the move the drag drew, not from the travel of
		 * the pointer: an element that stuck to a neighbour must not jump those
		 * few pixels back the moment it lands in another frame.
		 */
		'a drop into another frame lands where the snapping put it'() {

			const canvas = new $bog_figmol_app_canvas as $.$$.$bog_figmol_app_canvas

			const moved = [] as ( string | number )[]

			const store = canvas.store()
			store.root_id = ()=> 'root'
			store.parent = ()=> 'root'
			store.auto_layout = ()=> false
			store.node_reparent = ( id, parent, index, x, y )=> {
				moved.push( id, parent, index, x, y )
			}

			canvas.frame_at = ()=> 'frame'
			canvas.drop_index = ()=> 0
			canvas.node_origin = ( id: string )=> id === 'frame' ? [ 100, 100 ] : [ 0, 0 ]

			canvas.grab_sheets = { a: [ 300, 200 ] }
			canvas.grab_shift = [ 24, -8 ]

			// The pointer went further than the snapping let the element go.
			canvas.grab_x = 0
			canvas.last_x = 999

			canvas.node_settle( 'a' )

			$mol_assert_like( moved, [ 'a', 'frame', 0, 224, 92 ] )

		},

		'bringing several elements forward keeps their order among themselves'() {

			const canvas = new $bog_figmol_app_canvas as $.$$.$bog_figmol_app_canvas

			const lifted = [] as string[]
			const store = canvas.store()

			store.node_ids = ()=> [ 'a', 'b', 'c' ]
			store.node_lift = ( id: string )=> { lifted.push( id ) }

			canvas.selection([ 'c', 'a' ])

			canvas.lift( true )
			$mol_assert_like( lifted, [ 'a', 'c' ] )

			lifted.length = 0

			canvas.lift( false )
			$mol_assert_like( lifted, [ 'c', 'a' ] )

		},

		/**
		 * The box is measured in the coordinates of one frame, so elements living
		 * in different ones have no box in common to wrap.
		 */
		'wrapping refuses a selection spread across frames'() {

			const canvas = new $bog_figmol_app_canvas as $.$$.$bog_figmol_app_canvas

			const store = canvas.store()
			store.flow = ()=> false
			store.parent = ( id: string )=> id === 'a' ? 'one' : 'two'
			store.node_add = ()=> { $mol_fail( new Error( 'Nothing may be written' ) ) }

			canvas.selection([ 'a', 'b' ])
			canvas.menu_wrap( true )

			$mol_assert_like( canvas.selection(), [ 'a', 'b' ] )

		},

		'the right button picks what it was pressed on and opens the menu there'() {

			const canvas = new $bog_figmol_app_canvas as $.$$.$bog_figmol_app_canvas
			canvas.viewport = ()=> ({ left: 0, top: 0, width: 800, height: 600 }) as any

			const store = canvas.store()
			store.root_id = ()=> 'root'
			store.parent = ( id: string )=> id === 'card' ? 'root' : ''
			store.node_ids = ()=> [ 'card' ]

			// The press before it captured the pointer, so the event that follows
			// is retargeted onto the canvas and only that press knows what was hit.
			canvas.press_deep = 'card'

			canvas.context_menu({
				target: { closest: ()=> null },
				clientX: 120,
				clientY: 80,
				metaKey: false,
				ctrlKey: false,
				preventDefault: ()=> {},
			} as any )

			$mol_assert_like( canvas.selection(), [ 'card' ] )
			$mol_assert_like( canvas.menu(), [ 120, 80 ] )

		},

		/** A menu near the edge of the canvas opens inwards instead of off it. */
		'the menu stays inside the canvas'() {

			const canvas = new $bog_figmol_app_canvas as $.$$.$bog_figmol_app_canvas
			canvas.viewport = ()=> ({ left: 0, top: 0, width: 800, height: 600 }) as any

			const store = canvas.store()
			store.root_id = ()=> 'root'
			store.parent = ( id: string )=> id === 'card' ? 'root' : ''

			canvas.press_deep = 'card'

			canvas.context_menu({
				target: { closest: ()=> null },
				clientX: 790,
				clientY: 590,
				metaKey: false,
				ctrlKey: false,
				preventDefault: ()=> {},
			} as any )

			$mol_assert_like( canvas.menu(), [ 590, 390 ] )

		},

		'a press on empty space has nothing to offer and closes the menu'() {

			const canvas = new $bog_figmol_app_canvas as $.$$.$bog_figmol_app_canvas
			canvas.viewport = ()=> ({ left: 0, top: 0, width: 800, height: 600 }) as any

			canvas.menu([ 10, 10 ])
			canvas.press_deep = ''

			canvas.context_menu({
				target: { closest: ()=> null },
				clientX: 120,
				clientY: 80,
				metaKey: false,
				ctrlKey: false,
				preventDefault: ()=> {},
			} as any )

			$mol_assert_equal( canvas.menu(), null )

		},

	})

}
