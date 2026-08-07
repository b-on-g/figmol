namespace $ {

	/**
	 * Window every scenario is played out in, in screen pixels.
	 *
	 * Fixed rather than taken from the browser: the canvas hands out whatever is
	 * left of this after the rails, and a step that aims at a place on the sheet
	 * has to hit the same place in every run.
	 */
	const figmol_web_view = [ 1280, 800 ]

	/**
	 * Scenarios still on the page.
	 *
	 * A scenario that fails never reaches the line that clears its own, and what
	 * it leaves behind is not inert: the shortcuts listen on the window, so an
	 * editor nobody took off the page would answer the keys of every scenario
	 * after it — and one broken case would take the rest down with it.
	 */
	const figmol_web_left = [] as ( ()=> void )[]

	/**
	 * A box on screen only settles into its new size a frame or two later: the
	 * editor animates what it draws, and a measurement taken in between is a
	 * number from halfway through. Nothing here is about how a move looks, so
	 * the moves are turned off and every rectangle is the one that was written.
	 */
	const figmol_web_still = ()=> $mol_style_attach( 'figmol_web_still', [
		'[figmol_web_stage], [figmol_web_stage] * {',
		'	transition: none !important;',
		'	animation: none !important;',
		'}',
	].join( '\n' ) )

	/**
	 * The store the editor runs on, with one thing taken away: a new site goes
	 * into the Land this browser already has instead of a Land of its own.
	 *
	 * Everything else below the editor is the real thing — the journal, the
	 * ordered lists, the tree walks and every write into the Baza. Those are what
	 * a scenario is about; what it cannot afford is the Proof-of-Work of grabbing
	 * a Land, which is seconds even when it goes well.
	 *
	 * The Land itself is real and local: the mocks the Baza ships for tests give
	 * this context a Glob of its own, an in-memory store instead of IndexedDB and
	 * a yard with no master, so nothing here reaches the network or survives the
	 * test that made it.
	 */
	export class figmol_web_store extends $bog_figmol_store {

		override site_preset() {
			return null
		}

	}

	/** Everything one scenario holds on to, and the way to clear it away after. */
	export type figmol_web_scene = {

		readonly app: $.$$.$bog_figmol_app
		readonly canvas: $.$$.$bog_figmol_app_canvas
		readonly store: figmol_web_store

		/** Element the editor of this scenario is drawn in. */
		readonly node: HTMLElement

		/** Brings the page up to date with whatever the last step wrote. */
		draw(): void

		/** Presses the button on the start screen. Hands back the root frame. */
		build(): string

		/** Client point of a place on the sheet, the way a hand would aim at it. */
		spot( x: number, y: number ): { clientX: number, clientY: number }

		/** Element a node is drawn as, `null` while the canvas is not showing it. */
		shape( id: string ): HTMLElement | null

		done(): void

	}

	/**
	 * Puts the editor on the page and hands back the handles a scenario needs.
	 *
	 * The header is left out on purpose: it holds the sync indicator, which opens
	 * a socket to whatever master the build was made with. What a scenario works
	 * with is the editor itself — the palette, the rails, the canvas and the
	 * inspector, all of them the real views over a real store.
	 *
	 * Presence is the other thing stubbed out. It lives in a Land of its own,
	 * grabbed with Proof-of-Work by whoever opens the site first, and no scenario
	 * here is about somebody else's cursor.
	 */
	export function figmol_web_scene( $: $, editable = true ): figmol_web_scene {

		for( const left of figmol_web_left.splice( 0 ) ) left()

		figmol_web_still()

		const store = new figmol_web_store
		store.$ = $

		if( !editable ) store.writable = ()=> false

		const live = new $bog_figmol_live
		live.$ = $
		live.store = ()=> store
		live.start = ()=> {}
		live.room = ()=> null
		live.room_make = ()=> null

		const app = new $bog_figmol_app as $.$$.$bog_figmol_app
		app.$ = $
		app.store = ()=> store
		app.live = ()=> live
		live.picked = ()=> app.selection()

		const canvas = app.Canvas() as $.$$.$bog_figmol_app_canvas

		const doc = $.$mol_dom_context.document
		const host = doc.createElement( 'div' )

		host.setAttribute( 'figmol_web_stage', '' )

		// Pinned to the corner of the window, so a client point and a page point
		// are the same number and a step can aim at either.
		host.setAttribute( 'style', [
			'position: fixed',
			'left: 0',
			'top: 0',
			`width: ${ figmol_web_view[ 0 ] }px`,
			`height: ${ figmol_web_view[ 1 ] }px`,
			'overflow: hidden',
		].join( '; ' ) )

		doc.body.appendChild( host )

		// Both the app and the canvas listen on the window rather than on a node
		// of their own — the keys have to work wherever the focus is. Registering
		// them here means the scenario can take them off again: a listener left
		// behind would go on answering the keys of every scenario after this one.
		const kills = [] as ( ()=> void )[]
		const win = $.$mol_dom_context
		const add = win.addEventListener

		win.addEventListener = function( type: string, handler: any, opts?: any ) {
			kills.push( ()=> win.removeEventListener( type, handler, opts ) )
			return add.call( win, type, handler, opts )
		}

		try {
			app.listen()
			host.appendChild( app.Editor().dom_tree() )
		} finally {
			win.addEventListener = add
		}

		const draw = ()=> $mol_wire_fiber.sync()

		const done = ()=> {
			for( const kill of kills ) kill()
			host.remove()
		}

		figmol_web_left.push( done )

		return {

			app,
			canvas,
			store,
			node: host,

			draw,

			build() {

				figmol_web_click( app.Start().Make() )
				draw()

				// The viewport starts panned and scaled down, which is right for a
				// person and wrong for a scenario that names places on the sheet.
				canvas.zoom( 1 )
				canvas.pan_x( 0 )
				canvas.pan_y( 0 )
				draw()

				return store.root_id()
			},

			spot( x: number, y: number ) {
				const rect = canvas.Sheet().dom_node().getBoundingClientRect()
				const zoom = canvas.zoom_live()
				return { clientX: rect.left + x * zoom, clientY: rect.top + y * zoom }
			},

			shape( id: string ) {
				return host.querySelector( `[figmol_node="${ id }"]` ) as HTMLElement | null
			},

			done() {
				const at = figmol_web_left.indexOf( done )
				if( at >= 0 ) figmol_web_left.splice( at, 1 )
				done()
			},

		}
	}

	/** Presses a button the way a mouse does. */
	export function figmol_web_click( view: $mol_view ) {
		( view.dom_node() as HTMLElement ).click()
	}

	/** Types into a field the way a keyboard does: the value, then the event. */
	export function figmol_web_type( view: $mol_view, text: string ) {
		const node = view.dom_node() as HTMLInputElement
		node.value = text
		node.dispatchEvent( new InputEvent( 'input', { bubbles: true, data: text } ) )
	}

	/** One pointer event, with the fields a gesture of the canvas reads. */
	export function figmol_web_point( node: Element, type: string, init: PointerEventInit ) {
		node.dispatchEvent( new PointerEvent( type, {
			bubbles: true,
			cancelable: true,
			isPrimary: true,
			pointerId: 1,
			button: 0,
			buttons: 1,
			... init,
		} ) )
	}

	/**
	 * A whole drag: press on `from`, two moves and a release.
	 *
	 * The press goes to the element under the hand and the rest to the canvas,
	 * the way a browser routes them once the canvas has captured the pointer.
	 * Two moves rather than one because the first one is what tells a click from
	 * a drag, and a gesture the editor never saw moving is a click.
	 */
	export function figmol_web_drag(
		scene: figmol_web_scene,
		grab: Element,
		from: { clientX: number, clientY: number },
		to: { clientX: number, clientY: number },
		keys: PointerEventInit = {},
	) {

		const canvas = scene.canvas.dom_node()

		const half = {
			clientX: ( from.clientX + to.clientX ) / 2,
			clientY: ( from.clientY + to.clientY ) / 2,
		}

		figmol_web_point( grab, 'pointerdown', { ... from, ... keys } )
		scene.draw()

		figmol_web_point( canvas, 'pointermove', { ... half, ... keys } )
		scene.draw()

		figmol_web_point( canvas, 'pointermove', { ... to, ... keys } )
		scene.draw()

		figmol_web_point( canvas, 'pointerup', { ... to, ... keys, buttons: 0 } )
		scene.draw()
	}

	/** A key press, spelled the way both the window listener and a plugin read one. */
	export function figmol_web_key( node: EventTarget, code: string, key: number, mods: KeyboardEventInit = {} ) {

		const event = new KeyboardEvent( 'keydown', {
			bubbles: true,
			cancelable: true,
			code,
			... mods,
		} )

		// `$mol_hotkey` matches on the numeric code, which no browser lets an
		// event carry from its own constructor any more.
		Object.defineProperty( event, 'keyCode', { get: ()=> key } )

		node.dispatchEvent( event )

		return event
	}

	$mol_test({

		/**
		 * The editor of somebody who has never opened it before: an offer, and
		 * nothing that could be edited until it is taken up.
		 */
		'a first visit offers to make a site and hands back an editor'( $ ) {

			const scene = figmol_web_scene( $ )

			$mol_assert_equal( scene.node.querySelectorAll( '[bog_figmol_app_start]' ).length, 1 )
			$mol_assert_equal( scene.node.querySelectorAll( '[bog_figmol_app_canvas]' ).length, 0 )
			$mol_assert_equal( scene.store.site(), null )

			const root = scene.build()

			$mol_assert_ok( scene.store.site() )
			$mol_assert_ok( root )
			$mol_assert_equal( scene.store.page_ids().length, 1 )

			// The offer is gone and the three rails of the editor are in its place.
			$mol_assert_equal( scene.node.querySelectorAll( '[bog_figmol_app_start]' ).length, 0 )
			$mol_assert_equal( scene.node.querySelectorAll( '[bog_figmol_app_canvas]' ).length, 1 )
			$mol_assert_equal( scene.node.querySelectorAll( '[bog_figmol_app_tools]' ).length, 1 )
			$mol_assert_equal( scene.node.querySelectorAll( '[bog_figmol_app_side]' ).length, 1 )

			// The header offers the two things only an owner can do.
			$mol_assert_like( scene.app.head_tools(), [
				scene.app.Title(),
				scene.app.Status(),
				scene.app.Mates(),
				scene.app.Share(),
				scene.app.Publish_toggle(),
				scene.app.Theme_toggle(),
			] )

			scene.done()
		},

		/**
		 * A tool is armed in the palette and spent on the next press: the element
		 * appears where the press landed, and the palette goes back to selecting.
		 */
		'a tool from the palette draws its element where the canvas was pressed'( $ ) {

			const scene = figmol_web_scene( $ )
			const root = scene.build()

			const draw = ( tool: string, x: number, y: number )=> {
				figmol_web_click( scene.app.Tools().Tool( tool ) )
				scene.draw()
				$mol_assert_equal( scene.app.tool(), tool )
				figmol_web_point( scene.canvas.dom_node(), 'pointerdown', scene.spot( x, y ) )
				scene.draw()
			}

			draw( 'text', 300, 200 )
			draw( 'button', 600, 400 )
			draw( 'frame', 200, 600 )

			const kids = scene.store.kids( root )
			$mol_assert_equal( kids.length, 3 )
			$mol_assert_like( kids.map( id => scene.store.kind( id ) ), [ 'text', 'button', 'frame' ] )

			// A spent tool goes back to the arrow, or every press would keep
			// drawing the same thing.
			$mol_assert_equal( scene.app.tool(), 'select' )

			// The last one drawn is the one the inspector talks about.
			$mol_assert_equal( scene.app.selected(), kids[ 2 ] )

			// And every one of them is on the page where it was asked for.
			const at = ( id: string )=> {
				const rect = scene.shape( id )!.getBoundingClientRect()
				const sheet = scene.canvas.Sheet().dom_node().getBoundingClientRect()
				return [ Math.round( rect.left - sheet.left ), Math.round( rect.top - sheet.top ) ]
			}

			$mol_assert_like( at( kids[ 0 ] ), [ 300, 200 ] )
			$mol_assert_like( at( kids[ 1 ] ), [ 600, 400 ] )
			$mol_assert_like( at( kids[ 2 ] ), [ 200, 600 ] )

			// A caption nobody typed is still a caption: an empty box on the sheet
			// reads as a bug rather than as an invitation.
			$mol_assert_equal( scene.shape( kids[ 0 ] )!.textContent, scene.canvas.text_default() )

			scene.done()
		},

		/**
		 * The page list from end to end: a page is added, named, switched to and
		 * deleted, and the deletion is taken back — which has to put the page back
		 * where it was rather than at the end of the list.
		 */
		'a page is added, renamed, switched to, deleted and brought back in place'( $ ) {

			const scene = figmol_web_scene( $ )
			scene.build()

			const pages = scene.app.Side().Pages() as $.$$.$bog_figmol_app_pages
			const first = scene.store.page_ids()[ 0 ]

			figmol_web_click( pages.Add() )
			scene.draw()

			const ids = scene.store.page_ids()
			$mol_assert_equal( ids.length, 2 )
			$mol_assert_equal( scene.store.page_current(), ids[ 1 ] )

			figmol_web_type( pages.Title(), 'Pricing' )
			scene.draw()

			$mol_assert_equal( scene.store.page_title( ids[ 1 ] ), 'Pricing' )

			// The row of the list says the same thing the field does.
			$mol_assert_equal( pages.Row( ids[ 1 ] ).dom_node().textContent, 'Pricing' )
			$mol_assert_equal( pages.Row( ids[ 1 ] ).dom_node().getAttribute( 'figmol_active' ), 'true' )

			// Every page has a frame of its own, so switching changes what the
			// canvas is drawing on.
			const roots = [ scene.store.page_by( first )!.Root()!.val()!.str, scene.store.root_id() ]
			$mol_assert_ok( roots[ 0 ] !== roots[ 1 ] )

			figmol_web_click( pages.Row( first ) )
			scene.draw()

			$mol_assert_equal( scene.store.page_current(), first )
			$mol_assert_equal( scene.store.root_id(), roots[ 0 ] )

			// Back to the second one, and out with it.
			figmol_web_click( pages.Row( ids[ 1 ] ) )
			scene.draw()

			figmol_web_click( pages.Drop() )
			scene.draw()

			$mol_assert_like( scene.store.page_ids(), [ first ] )

			scene.store.undo()
			scene.draw()

			$mol_assert_like( scene.store.page_ids(), ids )
			$mol_assert_equal( scene.store.page_title( ids[ 1 ] ), 'Pricing' )

			scene.done()
		},

		/** An editor with no page has nothing to draw on, so the last one stays. */
		'the last page of a site cannot be deleted'( $ ) {

			const scene = figmol_web_scene( $ )
			scene.build()

			const pages = scene.app.Side().Pages() as $.$$.$bog_figmol_app_pages

			$mol_assert_equal( pages.droppable(), false )
			$mol_assert_equal( pages.Drop().dom_node().getAttribute( 'disabled' ), 'true' )

			figmol_web_click( pages.Drop() )
			scene.draw()

			$mol_assert_equal( scene.store.page_ids().length, 1 )

			scene.done()
		},

		/**
		 * The theme panel writes into the document and the sheet reads it back —
		 * one copy of the value, and the canvas showing what the built page will.
		 */
		'a theme picked in the panel repaints the sheet under the shapes'( $ ) {

			const scene = figmol_web_scene( $ )
			scene.build()

			const theme = scene.app.Side().Theme() as $.$$.$bog_figmol_app_theme
			const sheet = scene.canvas.Sheet().dom_node() as HTMLElement

			$mol_assert_equal( theme.font(), 'inter' )
			$mol_assert_equal( sheet.getAttribute( 'bog_builderui_lights' ), 'light' )

			figmol_web_type( theme.Back(), '#102030' )
			scene.draw()

			$mol_assert_equal( scene.store.theme( 'back' ), '#102030' )
			$mol_assert_equal(
				$.$mol_dom_context.getComputedStyle( sheet ).backgroundColor,
				'rgb(16, 32, 48)',
			)

			// The switches write a token rather than a colour, and the sheet wears
			// the very attributes the generated project puts on its root.
			theme.font( 'garamond' )
			theme.lights( 'dark' )
			scene.draw()

			$mol_assert_equal( sheet.getAttribute( 'bog_builderui_font_body' ), 'eb-garamond' )
			$mol_assert_equal( sheet.getAttribute( 'bog_builderui_font_head' ), 'eb-garamond' )
			$mol_assert_equal( sheet.getAttribute( 'bog_builderui_lights' ), 'dark' )

			scene.done()
		},

		/**
		 * Somebody else's site, opened by link: everything that reads is there and
		 * nothing that writes. Picking still works — the layer tree follows it, and
		 * the owner is shown the same frame the visitor sees.
		 */
		'a site without writing rights keeps the canvas and loses every control that writes'( $ ) {

			const scene = figmol_web_scene( $, false )
			const root = scene.build()

			const id = scene.store.node_add( 'rect', root, 200, 200, '' )
			scene.draw()

			$mol_assert_equal( scene.app.editable(), false )

			// Neither of the two buttons an owner gets is in the header.
			$mol_assert_equal( scene.app.head_tools().includes( scene.app.Share() ), false )
			$mol_assert_equal( scene.app.head_tools().includes( scene.app.Publish_toggle() ), false )

			// No palette of primitives, no blocks, no fields of the page.
			$mol_assert_equal( scene.node.querySelectorAll( '[bog_figmol_app_tools]' ).length, 0 )
			$mol_assert_equal( scene.node.querySelectorAll( '[bog_figmol_app_blocks]' ).length, 0 )
			$mol_assert_equal( scene.node.querySelectorAll( '[bog_figmol_app_theme]' ).length, 0 )
			$mol_assert_ok( scene.node.querySelector( '[bog_figmol_app_layers]' ) )

			// Picking is not writing, so it works.
			figmol_web_point( scene.shape( id )!, 'pointerdown', scene.spot( 250, 250 ) )
			scene.draw()

			$mol_assert_like( scene.app.selection(), [ id ] )

			// The inspector is a panel full of controls that would fail.
			$mol_assert_equal( scene.node.querySelectorAll( '[bog_figmol_app_inspector]' ).length, 0 )

			// No grips are drawn, and a drag moves nothing.
			$mol_assert_equal( scene.node.querySelectorAll( '[figmol_handle]' ).length, 0 )

			figmol_web_drag( scene, scene.shape( id )!, scene.spot( 250, 250 ), scene.spot( 450, 400 ) )

			$mol_assert_like( scene.store.rect( id ), [ 200, 200, 220, 140 ] )

			scene.done()
		},

	})

}
