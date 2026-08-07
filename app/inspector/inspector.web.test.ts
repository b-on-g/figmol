namespace $ {

	/** Presses on a shape and lets go, which is what picks it. */
	const figmol_web_pick = ( scene: figmol_web_scene, id: string, keys: PointerEventInit = {} )=> {

		const rect = scene.shape( id )!.getBoundingClientRect()
		const at = { clientX: rect.left + 10, clientY: rect.top + 5 }

		figmol_web_point( scene.shape( id )!, 'pointerdown', { ... at, ... keys } )
		figmol_web_point( scene.canvas.dom_node(), 'pointerup', { ... at, ... keys, buttons: 0 } )
		scene.draw()
	}

	$mol_test({

		/**
		 * Every field of the inspector writes straight into the document, and the
		 * canvas draws the document — so what is typed on the right shows up in the
		 * middle without anything in between being applied or confirmed.
		 */
		'the inspector writes the caption, the colour and the link, and the canvas shows all three'( $ ) {

			const scene = figmol_web_scene( $ )
			const root = scene.build()

			const id = scene.store.node_add( 'button', root, 200, 200, 'Button' )
			scene.draw()

			// Nothing is picked, so there is nothing to describe.
			$mol_assert_equal( scene.node.querySelectorAll( '[bog_figmol_app_inspector]' ).length, 0 )

			figmol_web_pick( scene, id )

			const inspector = scene.app.Inspector() as $.$$.$bog_figmol_app_inspector
			const panel = scene.node.querySelector( '[bog_figmol_app_inspector]' ) as HTMLElement

			$mol_assert_ok( panel )
			$mol_assert_equal( inspector.kind_title(), inspector.title_button() )

			// A button has a caption, an address and two colours, and the panel is
			// showing every one of them.
			for( const field of [ inspector.Field_label(), inspector.Field_uri(), inspector.Field_color() ] ) {
				$mol_assert_ok( panel.contains( field.dom_node() ) )
			}

			figmol_web_type( inspector.Label(), 'Buy now' )
			scene.draw()

			$mol_assert_equal( scene.store.text( id ), 'Buy now' )
			$mol_assert_equal( scene.shape( id )!.textContent, 'Buy now' )

			figmol_web_type( inspector.Color(), '#ff0000' )
			scene.draw()

			$mol_assert_equal(
				$.$mol_dom_context.getComputedStyle( scene.shape( id )! ).color,
				'rgb(255, 0, 0)',
			)

			figmol_web_type( inspector.Uri(), 'https://example.com/buy' )
			scene.draw()

			$mol_assert_equal( scene.store.uri( id ), 'https://example.com/buy' )

			// Typing a word is one gesture and costs one step back, not one per key.
			figmol_web_key( $.$mol_dom_context, 'KeyZ', 90, { metaKey: true } )
			scene.draw()

			$mol_assert_equal( scene.store.uri( id ), '' )
			$mol_assert_equal( scene.store.text( id ), 'Buy now' )

			scene.done()
		},

		/**
		 * The other way round: a caption typed on the sheet itself, in the element
		 * being edited, and the panel on the right saying the same thing.
		 */
		'a double click opens the caption for typing right on the sheet'( $ ) {

			const scene = figmol_web_scene( $ )
			const root = scene.build()

			const id = scene.store.node_add( 'text', root, 200, 200, 'Before' )
			scene.draw()

			figmol_web_pick( scene, id )

			const rect = scene.shape( id )!.getBoundingClientRect()

			scene.shape( id )!.dispatchEvent( new MouseEvent( 'dblclick', {
				bubbles: true,
				cancelable: true,
				clientX: rect.left + 10,
				clientY: rect.top + 5,
			} ) )
			scene.draw()

			$mol_assert_equal( scene.canvas.editing(), id )

			const editor = scene.shape( id )!.querySelector( '[figmol_edit]' ) as HTMLInputElement
			$mol_assert_ok( editor )
			$mol_assert_equal( editor.value, 'Before' )

			figmol_web_type( scene.canvas.Shape( id ).Editor(), 'After' )
			scene.draw()

			$mol_assert_equal( scene.store.text( id ), 'After' )

			const inspector = scene.app.Inspector() as $.$$.$bog_figmol_app_inspector
			$mol_assert_equal( inspector.text(), 'After' )

			// A press anywhere but in the caption ends the typing, including one
			// that lands on a panel the canvas never hears about.
			figmol_web_point( scene.node.querySelector( '[bog_figmol_app_side]' )!, 'pointerdown', {
				clientX: 10,
				clientY: 400,
			} )
			scene.draw()

			$mol_assert_equal( scene.canvas.editing(), '' )
			$mol_assert_equal( scene.shape( id )!.querySelector( '[figmol_edit]' ), null )
			$mol_assert_equal( scene.shape( id )!.textContent, 'After' )

			scene.done()
		},

		/**
		 * Inside an auto layout the frame decides where a child sits, so a field
		 * for its own X would be a field that changes nothing anybody can see.
		 */
		'an element placed by its frame is offered no coordinates'( $ ) {

			const scene = figmol_web_scene( $ )
			const root = scene.build()

			const loose = scene.store.node_add( 'rect', root, 700, 200, '' )
			const frame = scene.store.node_add( 'frame', root, 100, 100, '' )
			const inner = scene.store.node_add( 'rect', frame, 0, 0, '' )
			scene.draw()

			const inspector = scene.app.Inspector() as $.$$.$bog_figmol_app_inspector

			figmol_web_pick( scene, loose )

			let panel = scene.node.querySelector( '[bog_figmol_app_inspector]' ) as HTMLElement
			$mol_assert_ok( panel.contains( inspector.Field_x().dom_node() ) )
			$mol_assert_ok( panel.contains( inspector.Field_w().dom_node() ) )

			// ⌘ reaches straight into the frame, past the level being edited.
			figmol_web_pick( scene, inner, { metaKey: true } )

			$mol_assert_like( scene.canvas.selection(), [ inner ] )
			$mol_assert_equal( scene.store.flow( inner ), true )

			panel = scene.node.querySelector( '[bog_figmol_app_inspector]' ) as HTMLElement
			$mol_assert_equal( panel.contains( inspector.Field_x().dom_node() ), false )
			$mol_assert_equal( panel.contains( inspector.Field_y().dom_node() ), false )

			// The size is still its own, and so is everything else about it.
			$mol_assert_ok( panel.contains( inspector.Field_w().dom_node() ) )

			scene.done()
		},

		/**
		 * A component from end to end: made out of an element, placed twice, the
		 * master edited once for both, deleted, and brought back by one step back.
		 *
		 * Nothing is copied anywhere along the way — an instance draws the master
		 * itself, which is why an edit reaches every one of them at once and why
		 * deleting the master leaves them drawing nothing rather than a stale copy.
		 */
		'an element becomes a component, both instances follow the master, and undo brings it back'( $ ) {

			const scene = figmol_web_scene( $ )
			const root = scene.build()

			const frame = scene.store.node_add( 'frame', root, 100, 100, '' )
			scene.store.node_add( 'text', frame, 0, 0, 'Call to action' )
			scene.draw()

			figmol_web_pick( scene, frame )

			const inspector = scene.app.Inspector() as $.$$.$bog_figmol_app_inspector
			$mol_assert_equal( inspector.makeable(), true )

			figmol_web_click( inspector.Comp_make() )
			scene.draw()

			const comp = scene.store.comp_ids()[ 0 ]
			$mol_assert_ok( comp )
			$mol_assert_equal( scene.store.comp_title( comp ), 'Frame' )

			// The element is gone from the page and an instance stands in its place.
			const first = scene.store.kids( root )[ 0 ]
			$mol_assert_like( scene.store.kids( root ), [ first ] )
			$mol_assert_equal( scene.store.kind( first ), 'inst' )
			$mol_assert_equal( scene.store.master( first ), comp )

			const comps = scene.app.Side().Comps() as $.$$.$bog_figmol_app_comps
			figmol_web_click( comps.Pick( comp ) )
			scene.draw()

			const both = scene.store.kids( root )
			$mol_assert_equal( both.length, 2 )

			const drawn = ()=> both.map( id => scene.shape( id )!.textContent )
			$mol_assert_like( drawn(), [ 'Call to action', 'Call to action' ] )

			// Into the master, which the editor shows as a page of its own.
			figmol_web_click( comps.Edit( comp ) )
			scene.draw()

			$mol_assert_equal( scene.store.comp_current(), comp )
			$mol_assert_equal( scene.store.root_id(), scene.store.comp_root( comp ) )

			const label = scene.store.kids( scene.store.root_id() )[ 0 ]
			figmol_web_pick( scene, label )
			figmol_web_type( inspector.Text().Edit(), 'Buy now' )
			scene.draw()

			figmol_web_click( comps.Done() )
			scene.draw()

			$mol_assert_equal( scene.store.comp_current(), '' )
			$mol_assert_like( drawn(), [ 'Buy now', 'Buy now' ] )

			// Deleting the master leaves the instances empty rather than hunting
			// them down: the Baza is append-only, so one step back fills them again.
			figmol_web_click( comps.Edit( comp ) )
			scene.draw()
			figmol_web_click( comps.Drop() )
			scene.draw()

			$mol_assert_like( scene.store.comp_ids(), [] )
			$mol_assert_equal( scene.store.inst_root( both[ 0 ] ), '' )
			$mol_assert_like( drawn(), [ '', '' ] )

			figmol_web_key( $.$mol_dom_context, 'KeyZ', 90, { metaKey: true } )
			scene.draw()

			$mol_assert_like( scene.store.comp_ids(), [ comp ] )
			$mol_assert_like( drawn(), [ 'Buy now', 'Buy now' ] )

			scene.done()
		},

	})

}
