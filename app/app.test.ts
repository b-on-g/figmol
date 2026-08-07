namespace $ {

	$mol_test({

		'shape maps a rectangle onto absolute css'() {

			const shape = new $bog_figmol_app_canvas_shape as $.$$.$bog_figmol_app_canvas_shape
			shape.flow = ()=> false
			shape.stretched = ()=> ''
			shape.rect = ()=> [ 40, 60, 200, 120 ]

			$mol_assert_equal( shape.style_left(), '40px' )
			$mol_assert_equal( shape.style_top(), '60px' )
			$mol_assert_equal( shape.style_width(), '200px' )
			$mol_assert_equal( shape.style_height(), '120px' )

		},

		/**
		 * Inside an auto layout the frame decides where the element goes, so the
		 * element must not insist on coordinates of its own.
		 */
		'shape inside an auto layout gives up its own placement'() {

			const shape = new $bog_figmol_app_canvas_shape as $.$$.$bog_figmol_app_canvas_shape
			shape.flow = ()=> true
			shape.stretched = ()=> ''
			shape.rect = ()=> [ 40, 60, 200, 120 ]

			$mol_assert_equal( shape.style_left(), '' )
			$mol_assert_equal( shape.style_top(), '' )
			$mol_assert_equal( shape.style_width(), '200px' )

		},

		/** A stretched cross axis takes over the size, so the size steps aside. */
		'shape stretched by its frame drops the size along that axis'() {

			const shape = new $bog_figmol_app_canvas_shape as $.$$.$bog_figmol_app_canvas_shape
			shape.flow = ()=> true
			shape.stretched = ()=> 'width'
			shape.rect = ()=> [ 40, 60, 200, 120 ]

			$mol_assert_equal( shape.style_width(), '' )
			$mol_assert_equal( shape.style_height(), '120px' )

		},

		/** Four corners and four sides, and none of them until it is picked. */
		'shape shows grips only while selected'() {

			const plain = new $bog_figmol_app_canvas_shape as $.$$.$bog_figmol_app_canvas_shape
			plain.kind = ()=> 'rect'
			$mol_assert_equal( plain.content().length, 0 )

			const picked = new $bog_figmol_app_canvas_shape as $.$$.$bog_figmol_app_canvas_shape
			picked.kind = ()=> 'rect'
			picked.selected = ()=> true
			$mol_assert_equal( picked.content().length, 8 )

		},

		/** A group is framed and moved as a whole, and sized one element at a time. */
		'shape of one element out of several shows no grips'() {

			const shape = new $bog_figmol_app_canvas_shape as $.$$.$bog_figmol_app_canvas_shape
			shape.kind = ()=> 'rect'
			shape.selected = ()=> true
			shape.grips = ()=> false

			$mol_assert_equal( shape.content().length, 0 )

		},

		/** Grips that cannot be dragged are a promise the editor would not keep. */
		'shape of a site opened by link shows no grips'() {

			const shape = new $bog_figmol_app_canvas_shape as $.$$.$bog_figmol_app_canvas_shape
			shape.kind = ()=> 'rect'
			shape.selected = ()=> true
			shape.editable = ()=> false

			$mol_assert_equal( shape.content().length, 0 )

		},

		/** An `img` with an empty source draws the browser's broken image icon. */
		'an avatar with no picture draws a placeholder instead'() {

			const blank = new $bog_figmol_app_canvas_shape as $.$$.$bog_figmol_app_canvas_shape
			blank.kind = ()=> 'bui_avatar'
			blank.uri = ()=> ''

			$mol_assert_equal( blank.content()[ 0 ], blank.Avatar_stub() )

			const filled = new $bog_figmol_app_canvas_shape as $.$$.$bog_figmol_app_canvas_shape
			filled.kind = ()=> 'bui_avatar'
			filled.uri = ()=> 'https://example.com/face.png'

			$mol_assert_equal( filled.content()[ 0 ], filled.Bui_avatar() )

		},

		/** A frame draws the shapes of its kids and nothing else of its own. */
		'shape of a frame draws its kids'() {

			const kid = new $bog_figmol_app_canvas_shape as $.$$.$bog_figmol_app_canvas_shape

			const frame = new $bog_figmol_app_canvas_shape as $.$$.$bog_figmol_app_canvas_shape
			frame.kind = ()=> 'frame'
			frame.kids = ()=> [ kid ]

			$mol_assert_equal( frame.content().length, 1 )
			$mol_assert_equal( frame.content()[ 0 ], kid )

		},

		/** A block is drawn by the very component the published page will use. */
		'shape of a library block draws that component'() {

			const shape = new $bog_figmol_app_canvas_shape as $.$$.$bog_figmol_app_canvas_shape
			shape.kind = ()=> 'bui_badge'

			$mol_assert_equal( shape.content().length, 1 )
			$mol_assert_equal( shape.content()[ 0 ], shape.Bui_badge() )

		},

		/**
		 * A card takes the shapes of its children into the component, so pushing
		 * them into the shape as well would draw every one of them twice.
		 */
		'shape of a card hands its children over instead of drawing them'() {

			const kid = new $bog_figmol_app_canvas_shape as $.$$.$bog_figmol_app_canvas_shape

			const card = new $bog_figmol_app_canvas_shape as $.$$.$bog_figmol_app_canvas_shape
			card.kind = ()=> 'bui_card'
			card.kids = ()=> [ kid ]

			$mol_assert_equal( card.content().length, 1 )
			$mol_assert_equal( card.content()[ 0 ], card.Bui_card() )
			$mol_assert_equal( card.Bui_card().sub()[ 0 ], kid )

		},

		/** The layout of a card belongs to the component, not to the shape around it. */
		'shape of a card puts the layout on the component'() {

			const card = new $bog_figmol_app_canvas_shape as $.$$.$bog_figmol_app_canvas_shape
			card.kind = ()=> 'bui_card'

			const store = card.store()
			store.container = ()=> true
			store.direction = ()=> 'row'
			store.gap = ()=> 12
			store.padding = ()=> 20

			$mol_assert_equal( card.style_direction(), '' )
			$mol_assert_equal( card.style_padding(), '' )
			$mol_assert_equal( card.inner_direction(), 'row' )
			$mol_assert_equal( card.inner_gap(), '12px' )
			$mol_assert_equal( card.inner_padding(), '20px' )

		},

		'tab captions become keyed options'() {

			const shape = new $bog_figmol_app_canvas_shape as $.$$.$bog_figmol_app_canvas_shape
			shape.store().options = ()=> 'Overview | Activity |  | Settings'

			$mol_assert_like( shape.tab_options(), {
				overview: 'Overview',
				activity: 'Activity',
				settings: 'Settings',
			} )

		},

		/** A layer is named by its kind, with the beginning of its caption after it. */
		'a layer row quotes the caption of its element'() {

			const layers = new $bog_figmol_app_layers as $.$$.$bog_figmol_app_layers

			const store = layers.store()
			store.kind = ( id: string )=> id === 'a' ? 'bui_card' : 'text'
			store.text = ( id: string )=> id === 'a' ? '' : 'A caption long enough to be cut short'
			store.depth = ( id: string )=> id === 'a' ? 0 : 1

			$mol_assert_equal( layers.row_title( 'a' ), 'Card' )
			$mol_assert_equal( layers.row_title( 'b' ), 'Text · A caption long enough…' )
			$mol_assert_equal( layers.row_indent( 'a' ), '0.25rem' )
			$mol_assert_equal( layers.row_indent( 'b' ), '1rem' )

		},

		'canvas keeps the point under the cursor while zooming'() {

			const canvas = new $bog_figmol_app_canvas as $.$$.$bog_figmol_app_canvas
			canvas.dom_node = ()=> ({
				getBoundingClientRect: ()=> ({ left: 0, top: 0 }),
			}) as any

			canvas.zoom( 1 )
			canvas.pan_x( 0 )
			canvas.pan_y( 0 )

			const before = ( 300 - canvas.pan_x() ) / canvas.zoom()

			canvas.wheel_zoom({
				clientX: 300,
				clientY: 200,
				deltaX: 0,
				deltaY: -400,
				ctrlKey: true,
				metaKey: false,
				preventDefault: ()=> {},
			} as any )

			$mol_assert_ok( canvas.zoom() > 1 )
			$mol_assert_equal(
				Math.round( ( 300 - canvas.pan_x() ) / canvas.zoom() ),
				Math.round( before ),
			)

		},

		/**
		 * Drop order is read off the screen rather than off the model: an auto
		 * layout is the only thing that knows where its kids ended up.
		 */
		'canvas picks the drop slot by the middle of each neighbour'() {

			const canvas = new $bog_figmol_app_canvas as $.$$.$bog_figmol_app_canvas

			const store = canvas.store()
			store.kids = ()=> [ 'a', 'b', 'c' ]
			store.auto_layout = ()=> true
			store.direction = ()=> 'column'

			const tops = { a: 0, b: 100, c: 200 } as Record< string, number >
			canvas.shape_dom = ( id: string )=> ({
				getBoundingClientRect: ()=> ({
					left: 0, right: 100,
					top: tops[ id ], bottom: tops[ id ] + 100,
				}),
			}) as any as HTMLElement

			$mol_assert_equal( canvas.drop_index( 'frame', { clientX: 10, clientY: 10 }, '' ), 0 )
			$mol_assert_equal( canvas.drop_index( 'frame', { clientX: 10, clientY: 120 }, '' ), 1 )
			$mol_assert_equal( canvas.drop_index( 'frame', { clientX: 10, clientY: 290 }, '' ), 3 )

			// The node being dragged is not one of the neighbours it is measured
			// against, or it would always claim the slot it already sits in.
			$mol_assert_equal( canvas.drop_index( 'frame', { clientX: 10, clientY: 290 }, 'a' ), 2 )

		},

		/** Free placement has no order to speak of, so a drop just appends. */
		'canvas appends when the frame places its kids by hand'() {

			const canvas = new $bog_figmol_app_canvas as $.$$.$bog_figmol_app_canvas

			const store = canvas.store()
			store.kids = ()=> [ 'a', 'b' ]
			store.auto_layout = ()=> false

			$mol_assert_equal( canvas.drop_index( 'frame', { clientX: 0, clientY: 0 }, '' ), 2 )

		},

		/** A block nobody pointed at goes into the middle of what is on screen. */
		'a block from the palette lands in the middle of the viewport'() {

			const blocks = new $bog_figmol_app_blocks as $.$$.$bog_figmol_app_blocks
			blocks.spot = ()=> [ 500, 300 ]

			const store = blocks.store()
			store.root_id = ()=> 'root'
			store.kids = ()=> []

			$mol_assert_like( blocks.place( { kind: 'bui_card', w: 320, h: 200 } ), [ 340, 200 ] )

		},

		'a block steps aside from whatever already sits there'() {

			const blocks = new $bog_figmol_app_blocks as $.$$.$bog_figmol_app_blocks
			blocks.spot = ()=> [ 500, 300 ]

			const store = blocks.store()
			store.root_id = ()=> 'root'
			store.kids = ()=> [ 'a' ]
			store.rect = ()=> [ 340, 200, 320, 200 ]

			$mol_assert_like( blocks.place( { kind: 'bui_card', w: 320, h: 200 } ), [ 380, 240 ] )

		},

		/**
		 * Everything that shows a single element writes one link, and the app
		 * turns that into a selection of exactly one.
		 */
		'the panels talk about the last element picked'() {

			const app = new $bog_figmol_app as $.$$.$bog_figmol_app

			$mol_assert_equal( app.selected(), '' )

			app.selection([ 'a', 'b' ])
			$mol_assert_equal( app.selected(), 'b' )

			app.selected( 'c' )
			$mol_assert_like( app.selection(), [ 'c' ] )

			app.selected( '' )
			$mol_assert_like( app.selection(), [] )

		},

		'a shift click adds an element to the selection and takes it back out'() {

			const canvas = new $bog_figmol_app_canvas as $.$$.$bog_figmol_app_canvas

			canvas.selection([ 'a' ])

			canvas.toggle( 'b' )
			$mol_assert_like( canvas.selection(), [ 'a', 'b' ] )

			canvas.toggle( 'a' )
			$mol_assert_like( canvas.selection(), [ 'b' ] )

		},

		/** Grips belong to a lone element, a frame is drawn around every one of them. */
		'a canvas frames the whole selection and sizes a single element'() {

			const canvas = new $bog_figmol_app_canvas as $.$$.$bog_figmol_app_canvas

			canvas.selection([ 'a', 'b' ])

			$mol_assert_ok( canvas.shape_selected( 'a' ) )
			$mol_assert_ok( canvas.shape_selected( 'b' ) )
			$mol_assert_ok( !canvas.shape_grips( 'a' ) )

			canvas.selection([ 'a' ])
			$mol_assert_ok( canvas.shape_grips( 'a' ) )

		},

		/**
		 * A click takes the outermost element of the level being edited, so a card
		 * moves as one thing instead of falling apart into its captions.
		 */
		'a click picks the outer element and ⌘ the deepest one'() {

			const canvas = new $bog_figmol_app_canvas as $.$$.$bog_figmol_app_canvas

			const parents = { card: 'root', text: 'card', other: 'root' } as Record< string, string >

			const store = canvas.store()
			store.root_id = ()=> 'root'
			store.parent = ( id: string )=> parents[ id ] ?? ''
			store.node_ids = ()=> [ 'card', 'text', 'other' ]

			const plain = { metaKey: false, ctrlKey: false }

			$mol_assert_equal( canvas.pick( 'text', plain ), 'card' )
			$mol_assert_equal( canvas.pick( 'text', { metaKey: true, ctrlKey: false } ), 'text' )

			// A double click went into the card: clicks now pick what is inside it.
			canvas.scope( 'card' )
			$mol_assert_equal( canvas.pick( 'text', plain ), 'text' )

			// And a click outside the card steps back out of it.
			$mol_assert_equal( canvas.pick( 'other', plain ), 'other' )
			$mol_assert_equal( canvas.scope(), '' )

		},

		'the rubber band adds what it caught to what was picked before'() {

			const canvas = new $bog_figmol_app_canvas as $.$$.$bog_figmol_app_canvas

			canvas.marquee_hits = ()=> [ 'b', 'c' ]
			canvas.marquee([ 0, 0, 100, 100 ])
			canvas.grab_base = [ 'a' ]

			canvas.marquee_settle()

			$mol_assert_like( canvas.selection(), [ 'a', 'b', 'c' ] )

		},

		/** A band dragged up and to the left is the same box as one dragged down. */
		'the rubber band is a box whichever way it was pulled'() {

			const canvas = new $bog_figmol_app_canvas as $.$$.$bog_figmol_app_canvas

			canvas.marquee([ 100, 80, 40, 20 ])

			$mol_assert_like( canvas.marquee_box(), [ 40, 20, 60, 60 ] )

		},

		'zoom steps keep the middle of the window in place'() {

			const canvas = new $bog_figmol_app_canvas as $.$$.$bog_figmol_app_canvas
			canvas.dom_node = ()=> ({
				getBoundingClientRect: ()=> ({ left: 0, top: 0, width: 800, height: 600 }),
			}) as any

			canvas.zoom( 1 )
			canvas.pan_x( 0 )
			canvas.pan_y( 0 )

			const before = ( 400 - canvas.pan_x() ) / canvas.zoom()

			canvas.zoom_step( 1 )

			$mol_assert_ok( canvas.zoom() > 1 )
			$mol_assert_equal(
				Math.round( ( 400 - canvas.pan_x() ) / canvas.zoom() ),
				Math.round( before ),
			)

			canvas.zoom_reset()
			$mol_assert_equal( canvas.zoom(), 1 )

		},

		'fitting the page centres what is drawn on it'() {

			const canvas = new $bog_figmol_app_canvas as $.$$.$bog_figmol_app_canvas
			canvas.dom_node = ()=> ({
				getBoundingClientRect: ()=> ({ left: 0, top: 0, width: 800, height: 600 }),
			}) as any

			canvas.content_box = ()=> [ 100, 50, 400, 200 ]

			canvas.zoom_fit()

			// The width is the tighter of the two: ( 800 - 48 * 2 ) / 400.
			$mol_assert_equal( canvas.zoom(), 1.76 )
			$mol_assert_equal( canvas.pan_x(), ( 800 - 400 * 1.76 ) / 2 - 100 * 1.76 )
			$mol_assert_equal( canvas.pan_y(), ( 600 - 200 * 1.76 ) / 2 - 50 * 1.76 )

		},

		'delete takes out everything that is picked'() {

			const canvas = new $bog_figmol_app_canvas as $.$$.$bog_figmol_app_canvas

			const dropped = [] as string[]
			canvas.store().node_drop = ( id: string )=> { dropped.push( id ) }

			canvas.selection([ 'a', 'b' ])
			canvas.drop( true )

			$mol_assert_like( dropped, [ 'a', 'b' ] )
			$mol_assert_like( canvas.selection(), [] )

		},

		/**
		 * A width typed into a field would be the width of every element picked,
		 * which is a decision of its own — so a group gets a count and a way out.
		 */
		'the inspector counts a group instead of describing it'() {

			const inspector = new $bog_figmol_app_inspector as $.$$.$bog_figmol_app_inspector

			inspector.selection = ()=> [ 'a', 'b' ]
			inspector.selected( 'b' )

			// The captions come out of the locale, which is not what is being
			// checked here — only which of them the panel reaches for.
			inspector.title_many = ()=> 'Selected'
			inspector.drop_label = ()=> 'one'
			inspector.drop_many_label = ()=> 'many'

			$mol_assert_like( inspector.rows(), [ inspector.Head(), inspector.Drop() ] )
			$mol_assert_equal( inspector.kind_title(), 'Selected: 2' )
			$mol_assert_equal( inspector.drop_caption(), 'many' )

		},

		/** Nothing on this panel writes but the palette, so the rest stays put. */
		'a site opened by link keeps the lists and loses the palette'() {

			const own = new $bog_figmol_app_side as $.$$.$bog_figmol_app_side
			$mol_assert_like( own.panels(), [ own.Pages(), own.Blocks(), own.Layers() ] )

			const guest = new $bog_figmol_app_side as $.$$.$bog_figmol_app_side
			guest.editable = ()=> false
			$mol_assert_like( guest.panels(), [ guest.Pages(), guest.Layers() ] )

		},

		'the page list keeps its fields for an editor only'() {

			const own = new $bog_figmol_app_pages as $.$$.$bog_figmol_app_pages
			$mol_assert_equal( own.panels().length, 5 )
			$mol_assert_like( own.head_content(), [ own.Caption(), own.Add() ] )

			const guest = new $bog_figmol_app_pages as $.$$.$bog_figmol_app_pages
			guest.editable = ()=> false
			$mol_assert_like( guest.panels(), [ guest.Head(), guest.List() ] )
			$mol_assert_like( guest.head_content(), [ guest.Caption() ] )

		},

	})

}
