namespace $ {

	$mol_test({

		/**
		 * A drag that comes close to a neighbour lands exactly on it, says so with
		 * a guide across the sheet, and writes nothing until the pointer is let go
		 * — a drag that wrote as it went would be hundreds of units for one move.
		 */
		'a dragged element sticks to its neighbour and says so with a guide'( $ ) {

			const scene = figmol_web_scene( $ )
			const root = scene.build()

			const near = scene.store.node_add( 'rect', root, 100, 100, '' )
			const moved = scene.store.node_add( 'rect', root, 500, 400, '' )
			scene.draw()

			// Three pixels short of the left edge of the neighbour, which is well
			// within the six a hand is allowed to miss by.
			const from = scene.spot( 610, 470 )
			const to = scene.spot( 213, 470 )

			figmol_web_point( scene.shape( moved )!, 'pointerdown', from )
			scene.draw()

			figmol_web_point( scene.canvas.dom_node(), 'pointermove', to )
			scene.draw()

			$mol_assert_equal( scene.canvas.guide_x(), 100 )
			$mol_assert_equal( scene.canvas.guide_y(), null )
			$mol_assert_ok( scene.node.querySelector( '[bog_figmol_app_canvas_guide_x]' ) )

			// The rulers to whatever the box now stands beside are up as well.
			$mol_assert_ok( scene.node.querySelector( '[bog_figmol_app_canvas_measure]' ) )

			// The shape has moved on screen and the document has not heard of it.
			$mol_assert_like( scene.canvas.shape_rect( moved ), [ 100, 400, 220, 140 ] )
			$mol_assert_like( scene.store.rect( moved ), [ 500, 400, 220, 140 ] )
			$mol_assert_equal(
				Math.round( scene.shape( moved )!.getBoundingClientRect().left ),
				Math.round( scene.shape( near )!.getBoundingClientRect().left ),
			)

			figmol_web_point( scene.canvas.dom_node(), 'pointerup', { ... to, buttons: 0 } )
			scene.draw()

			$mol_assert_like( scene.store.rect( moved ), [ 100, 400, 220, 140 ] )

			// The guide belongs to the gesture and goes away with it.
			$mol_assert_equal( scene.canvas.guide_x(), null )
			$mol_assert_equal( scene.node.querySelector( '[bog_figmol_app_canvas_guide_x]' ), null )

			scene.done()
		},

		/**
		 * A corner grip moves two edges and a side grip moves one, and the corner
		 * across from whichever is pulled stays where it is.
		 */
		'a corner grip resizes both ways and a side grip only its own'( $ ) {

			const scene = figmol_web_scene( $ )
			const root = scene.build()

			const id = scene.store.node_add( 'rect', root, 300, 300, '' )
			scene.canvas.selection([ id ])
			scene.draw()

			// Grips belong to a single picked element, and there they are.
			$mol_assert_equal( scene.shape( id )!.querySelectorAll( '[figmol_handle]' ).length, 8 )

			figmol_web_drag(
				scene,
				scene.canvas.Shape( id ).Handle_se().dom_node(),
				scene.spot( 520, 440 ),
				scene.spot( 560, 460 ),
			)

			$mol_assert_like( scene.store.rect( id ), [ 300, 300, 260, 160 ] )

			// A side grip is offered the other axis and refuses it.
			figmol_web_drag(
				scene,
				scene.canvas.Shape( id ).Handle_e().dom_node(),
				scene.spot( 560, 380 ),
				scene.spot( 590, 430 ),
			)

			$mol_assert_like( scene.store.rect( id ), [ 300, 300, 290, 160 ] )

			// The box on screen is the box in the document.
			const rect = scene.shape( id )!.getBoundingClientRect()
			$mol_assert_equal( Math.round( rect.width ), 290 )
			$mol_assert_equal( Math.round( rect.height ), 160 )

			// A grip that pulls the west edge leaves the east one alone.
			figmol_web_drag(
				scene,
				scene.canvas.Shape( id ).Handle_w().dom_node(),
				scene.spot( 300, 380 ),
				scene.spot( 340, 380 ),
			)

			$mol_assert_like( scene.store.rect( id ), [ 340, 300, 250, 160 ] )

			scene.done()
		},

		/**
		 * A band pulled across empty space picks up everything it touches, the
		 * whole lot moves as one, and one step back is the whole of that move —
		 * not one step per element.
		 */
		'a rubber band picks several elements and one undo takes their move back'( $ ) {

			const scene = figmol_web_scene( $ )
			const root = scene.build()

			const a = scene.store.node_add( 'rect', root, 100, 300, '' )
			const b = scene.store.node_add( 'rect', root, 400, 300, '' )
			const far = scene.store.node_add( 'rect', root, 900, 300, '' )
			scene.draw()

			figmol_web_drag(
				scene,
				scene.canvas.dom_node(),
				scene.spot( 80, 280 ),
				scene.spot( 700, 500 ),
			)

			$mol_assert_like( scene.canvas.selection(), [ a, b ] )

			// A frame is drawn around several elements instead of grips on each.
			$mol_assert_ok( scene.node.querySelector( '[figmol_group]' ) )
			$mol_assert_equal( scene.shape( a )!.querySelectorAll( '[figmol_handle]' ).length, 0 )

			figmol_web_drag(
				scene,
				scene.shape( b )!,
				scene.spot( 510, 370 ),
				scene.spot( 560, 400 ),
			)

			$mol_assert_like( scene.store.rect( a ), [ 150, 330, 220, 140 ] )
			$mol_assert_like( scene.store.rect( b ), [ 450, 330, 220, 140 ] )
			$mol_assert_like( scene.store.rect( far ), [ 900, 300, 220, 140 ] )

			figmol_web_key( $.$mol_dom_context, 'KeyZ', 90, { metaKey: true } )
			scene.draw()

			$mol_assert_like( scene.store.rect( a ), [ 100, 300, 220, 140 ] )
			$mol_assert_like( scene.store.rect( b ), [ 400, 300, 220, 140 ] )

			scene.done()
		},

		/**
		 * A frame with a direction lays its children out itself: what falls into
		 * one joins the flow and gives up its own coordinates, and what is pulled
		 * back out keeps the place the pointer left it in.
		 */
		'an element dropped into a frame joins its flow and comes back out where it was left'( $ ) {

			const scene = figmol_web_scene( $ )
			const root = scene.build()

			const frame = scene.store.node_add( 'frame', root, 100, 100, '' )
			const box = scene.store.node_add( 'rect', root, 800, 150, '' )
			scene.draw()

			$mol_assert_equal( scene.store.auto_layout( frame ), true )
			$mol_assert_equal( scene.store.flow( box ), false )

			const grab = scene.spot( 910, 220 )
			const drop = scene.spot( 340, 260 )

			figmol_web_point( scene.shape( box )!, 'pointerdown', grab )
			scene.draw()

			figmol_web_point( scene.canvas.dom_node(), 'pointermove', drop )
			scene.draw()

			// The frame the drop is aimed at says so while the pointer is still down.
			$mol_assert_equal( scene.canvas.drop_target(), frame )
			$mol_assert_equal( scene.shape( frame )!.getAttribute( 'figmol_dropping' ), 'true' )

			figmol_web_point( scene.canvas.dom_node(), 'pointerup', { ... drop, buttons: 0 } )
			scene.draw()

			$mol_assert_equal( scene.store.parent( box ), frame )
			$mol_assert_equal( scene.store.flow( box ), true )
			$mol_assert_ok( scene.shape( frame )!.contains( scene.shape( box )! ) )

			// Its own placement is gone: the frame decides where it sits now.
			$mol_assert_equal( scene.shape( box )!.getAttribute( 'figmol_flow' ), 'true' )
			$mol_assert_equal( scene.shape( box )!.style.left, '' )
			$mol_assert_equal( scene.canvas.drop_target(), '' )

			// And back out onto the page. A press on a child of a frame takes the
			// frame, so getting hold of the child is a double click first — the
			// same way in as anywhere else.
			const inside = scene.shape( box )!.getBoundingClientRect()

			scene.shape( box )!.dispatchEvent( new MouseEvent( 'dblclick', {
				bubbles: true,
				cancelable: true,
				clientX: inside.left + 20,
				clientY: inside.top + 10,
			} ) )
			scene.draw()

			$mol_assert_equal( scene.canvas.scope(), frame )
			$mol_assert_like( scene.canvas.selection(), [ box ] )

			const before = scene.canvas.node_place( box )
			const out_from = scene.spot( before[ 0 ] + 20, before[ 1 ] + 20 )
			const out_to = scene.spot( 820, 620 )

			figmol_web_drag( scene, scene.shape( box )!, out_from, out_to )

			$mol_assert_equal( scene.store.parent( box ), root )
			$mol_assert_equal( scene.store.flow( box ), false )
			$mol_assert_equal( scene.store.x( box ), 800 )
			$mol_assert_equal( scene.store.y( box ), 600 )

			scene.done()
		},

		/**
		 * Inside an auto layout a drag is about the order and not about the
		 * coordinates, and where the element ends up is read off the screen —
		 * the numbers stored on it say nothing there.
		 */
		'a drag inside an auto layout changes the order of the frame'( $ ) {

			const scene = figmol_web_scene( $ )
			const root = scene.build()

			const frame = scene.store.node_add( 'frame', root, 100, 100, '' )
			const one = scene.store.node_add( 'rect', frame, 0, 0, '' )
			const two = scene.store.node_add( 'rect', frame, 0, 0, '' )
			scene.draw()

			$mol_assert_like( scene.store.kids( frame ), [ one, two ] )

			const first = scene.shape( one )!.getBoundingClientRect()
			const second = scene.shape( two )!.getBoundingClientRect()

			// A press on a child of a frame takes the frame, so the way to an
			// element inside one is the same as everywhere: a double click in.
			scene.shape( two )!.dispatchEvent( new MouseEvent( 'dblclick', {
				bubbles: true,
				cancelable: true,
				clientX: second.left + 20,
				clientY: second.top + 10,
			} ) )
			scene.draw()

			$mol_assert_equal( scene.canvas.scope(), frame )
			$mol_assert_like( scene.canvas.selection(), [ two ] )

			// Above the middle of the element that is first, which is the whole of
			// what "put this one before that one" means to the drop.
			figmol_web_drag(
				scene,
				scene.shape( two )!,
				{ clientX: second.left + 20, clientY: second.top + 10 },
				{ clientX: first.left + 20, clientY: first.top + 5 },
			)

			$mol_assert_like( scene.store.kids( frame ), [ two, one ] )

			// The page shows the same order, and neither of them has moved out.
			const drawn = [ ... scene.shape( frame )!.children ]
				.map( node => node.getAttribute( 'figmol_node' ) )
				.filter( id => !!id )

			$mol_assert_like( drawn, [ two, one ] )
			$mol_assert_equal( scene.store.parent( two ), frame )

			scene.done()
		},

		/**
		 * What a press picks out of the stack under it: the outermost element of
		 * the level being edited, whatever is deepest with ⌘, and one level deeper
		 * after a double click.
		 */
		'a press picks the outer element, ⌘ the deepest and a double click goes inside'( $ ) {

			const scene = figmol_web_scene( $ )
			const root = scene.build()

			const card = scene.store.node_add( 'bui_card', root, 100, 100, '' )
			const label = scene.store.node_add( 'text', card, 0, 0, 'Inside' )
			scene.draw()

			const at = ()=> {
				const rect = scene.shape( label )!.getBoundingClientRect()
				return { clientX: rect.left + 10, clientY: rect.top + 5 }
			}

			figmol_web_point( scene.shape( label )!, 'pointerdown', at() )
			figmol_web_point( scene.canvas.dom_node(), 'pointerup', { ... at(), buttons: 0 } )
			scene.draw()

			$mol_assert_like( scene.canvas.selection(), [ card ] )

			figmol_web_point( scene.shape( label )!, 'pointerdown', { ... at(), metaKey: true } )
			figmol_web_point( scene.canvas.dom_node(), 'pointerup', { ... at(), metaKey: true, buttons: 0 } )
			scene.draw()

			$mol_assert_like( scene.canvas.selection(), [ label ] )

			// ⌘ reaches past the level being edited without changing it.
			$mol_assert_equal( scene.canvas.scope(), '' )

			scene.canvas.selection([ card ])
			scene.draw()

			scene.shape( label )!.dispatchEvent( new MouseEvent( 'dblclick', {
				bubbles: true,
				cancelable: true,
				... at(),
			} ) )
			scene.draw()

			$mol_assert_equal( scene.canvas.scope(), card )
			$mol_assert_like( scene.canvas.selection(), [ label ] )

			// Clicks are now inside the card, so a plain press takes the caption.
			figmol_web_point( scene.shape( label )!, 'pointerdown', at() )
			figmol_web_point( scene.canvas.dom_node(), 'pointerup', { ... at(), buttons: 0 } )
			scene.draw()

			$mol_assert_like( scene.canvas.selection(), [ label ] )

			scene.done()
		},

		/**
		 * The shortcuts, on the keys every editor spells them with: duplicate,
		 * nudge by one pixel and by ten, delete and drop the selection.
		 */
		'the keyboard duplicates, nudges, deletes and lets go'( $ ) {

			const scene = figmol_web_scene( $ )
			const root = scene.build()

			const id = scene.store.node_add( 'rect', root, 300, 300, '' )
			scene.canvas.selection([ id ])
			scene.draw()

			const win = $.$mol_dom_context

			figmol_web_key( win, 'KeyD', 68, { metaKey: true } )
			scene.draw()

			const kids = scene.store.kids( root )
			$mol_assert_equal( kids.length, 2 )

			// A copy stands beside the original and is what the next step acts on.
			const copy = kids[ 1 ]
			$mol_assert_like( scene.canvas.selection(), [ copy ] )
			$mol_assert_like( scene.store.rect( copy ), [ 324, 324, 220, 140 ] )
			$mol_assert_ok( scene.shape( copy ) )

			figmol_web_key( win, 'ArrowRight', 39 )
			scene.draw()
			$mol_assert_equal( scene.store.x( copy ), 325 )

			figmol_web_key( win, 'ArrowDown', 40, { shiftKey: true } )
			scene.draw()
			$mol_assert_equal( scene.store.y( copy ), 334 )

			// Delete belongs to the canvas, which hears the keys once it has focus.
			figmol_web_key( scene.canvas.dom_node(), 'Delete', 46 )
			scene.draw()

			$mol_assert_like( scene.store.kids( root ), [ id ] )
			$mol_assert_like( scene.canvas.selection(), [] )
			$mol_assert_equal( scene.shape( copy ), null )

			// And Escape lets go of whatever is picked.
			scene.canvas.selection([ id ])
			scene.draw()
			$mol_assert_equal( scene.shape( id )!.getAttribute( 'figmol_selected' ), 'true' )

			figmol_web_key( scene.canvas.dom_node(), 'Escape', 27 )
			scene.draw()

			$mol_assert_like( scene.canvas.selection(), [] )
			$mol_assert_equal( scene.shape( id )!.getAttribute( 'figmol_selected' ), null )

			// One step back brings the copy the ⌘D made, and the delete with it.
			figmol_web_key( win, 'KeyZ', 90, { metaKey: true } )
			scene.draw()

			$mol_assert_like( scene.store.kids( root ), [ id, copy ] )

			scene.done()
		},

	})

}
