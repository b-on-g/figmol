namespace $.$$ {
	// Синхронизация через Гипер Базу отключена: список мастеров пустой.
	// Чистки одного masters_default мало — masters() склеивает его с пирами
	// из бандленного сида, где зашит публичный мастер. Глушим сам masters().
	$giper_baza_yard.masters_default.length = 0
	$giper_baza_yard.masters = (): string[] => []


	/** How far an arrow key moves the selected element, and how far with Shift. */
	const figmol_app_nudge = 1
	const figmol_app_nudge_far = 10

	/** Where a field is being typed into, and the editor keeps its hands off. */
	const figmol_app_fields = 'input, textarea, [contenteditable="true"]'

	const figmol_app_arrows = [ 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown' ]

	/**
	 * Editor shell: a header strip, the tool palette, the canvas and the right
	 * rail — the inspector, or the publishing panel when that is open.
	 *
	 * `tool` and the selection live here rather than inside the canvas because
	 * the palette and the inspector need them too.
	 *
	 * The selection is a list, and `selected` is a view onto its last element:
	 * everything that shows a single node — the inspector, the layer tree, the
	 * palette that picks what it has just dropped — goes on writing and reading
	 * one link, and writing it means "this one and nothing else". The canvas is
	 * the only child that writes the list, being the only one that can pick
	 * several things at once.
	 *
	 * The store is made here as well, and handed to both readers as a typed
	 * property. One instance means one answer to what a node is, and passing it
	 * down through view.tree keeps that answer typed on both ends.
	 */
	export class $bog_figmol_app extends $.$bog_figmol_app {

		/**
		 * Touching the site keeps the home Land subscribed while the editor is
		 * mounted. Without a reader the Land loses its last subscriber whenever
		 * the screen rebuilds, and destructing it walks into a circular
		 * subscription.
		 *
		 * The keyboard is hooked up here too — `listen` is memoized, so this
		 * happens once for as long as the app is on screen.
		 */
		override auto() {

			let site = null as ReturnType< $bog_figmol_store[ 'site' ] >

			try {
				site = this.store().site()
			} catch( error ) {
				if( !$mol_promise_like( error ) ) $mol_fail_log( error )
			}

			this.listen()
			this.oauth_catch()
			this.live().start()

			if( site ) this.live_open()

			super.auto()
		}

		/* -------------------------------------------------------------- presence */

		/**
		 * Whether the room has been asked for already.
		 *
		 * A plain field for the same reason `oauth_seen` is one: `auto` belongs to
		 * a memoized render and is re-entered whenever anything it reads changes,
		 * and a cell reset along with it would grab a second Land.
		 */
		live_seen = false

		/**
		 * Makes the room the first time the owner opens this site, in a fiber of
		 * its own — grabbing a Land runs Proof of Work, and the task belongs to
		 * whoever asked for it. A visitor asks for nothing: the link to the room
		 * lives in the site, and writing there is not theirs to do.
		 *
		 * A window with no site yet asks for nothing either, which is why `auto`
		 * only calls this once there is one: it reads the site and is re-entered
		 * when one appears, so pressing "create a site" opens the room right after.
		 */
		live_open() {

			if( this.live_seen ) return
			this.live_seen = true

			$mol_wire_async( this.live() ).room_make().catch( ( error: unknown )=> {
				if( !$mol_promise_like( error ) ) $mol_fail_log( error )
			} )
		}

		/* -------------------------------------------------------------- selection */

		/**
		 * The node a single-element panel talks about: the last one picked.
		 *
		 * Writing it replaces the whole selection, which is what a click in the
		 * layer tree or a freshly dropped block means. Not memoized on purpose —
		 * it is a plain view onto `selection`, and the atom behind that is the one
		 * place the value lives.
		 */
		override selected( next?: string ) {

			if( next !== undefined ) this.selection( next ? [ next ] : [] )

			const ids = this.selection()
			return ids[ ids.length - 1 ] ?? ''
		}

		/* ------------------------------------------------------------- signing in */

		/**
		 * Whether the return from GitHub has been picked up already.
		 *
		 * A plain field rather than an atom: `auto` runs inside a memoized render
		 * and is re-entered whenever anything it reads changes — the address
		 * included, which this very handler is about to rewrite. A cell would be
		 * reset along with the render and let a spent code go round again.
		 */
		oauth_seen = false

		/**
		 * A code in the address means the user is coming back from the consent
		 * screen. The rail is reopened and the panel finishes the exchange: the
		 * token is its business, and a refusal needs somewhere to be shown.
		 *
		 * Both are done in a fiber of their own — `auto` is part of a render, and
		 * writing state from there loops.
		 */
		oauth_catch() {

			if( this.oauth_seen ) return
			this.oauth_seen = true

			const href = this.$.$mol_state_arg.href()
			const back = this.$.$bog_figmol_deploy_github.oauth_return( href )

			if( !back.code && !back.error ) return

			$mol_wire_async( this ).oauth_land( href )
		}

		/** Never decorated — `$mol_wire_async` above hands it a fiber. */
		oauth_land( href: string ) {
			this.publishing( true )
			;( this.Publish() as $.$$.$bog_figmol_deploy_publish ).oauth_land( href )
		}

		/* --------------------------------------------------------------- rights */

		/**
		 * Whether this window may change anything.
		 *
		 * A site opened by somebody else's link is readable and nothing more, and
		 * finding that out needs the Land — which suspends while it arrives. That
		 * is not an error and not a reason to blank the header out: the honest
		 * answer until the units are here is "no", and the atom recomputes itself
		 * once they are.
		 */
		@ $mol_mem
		editable() {
			try {
				return this.store().writable()
			} catch( error ) {
				if( !$mol_promise_like( error ) ) $mol_fail_log( error )
				return false
			}
		}

		/** Whether the address names a site instead of the one this account owns. */
		shared() {
			return !!this.store().share_link()
		}

		/* ---------------------------------------------------------------- header */

		@ $mol_mem
		override head_tools(): readonly $mol_view[] {

			const res = [ this.Title(), this.Status(), this.Mates() ] as $mol_view[]

			if( this.editable() ) res.push( this.Share(), this.Publish_toggle() )
			else if( this.shared() ) res.push( this.Readonly(), this.Mine() )

			res.push( this.Theme_toggle() )

			return res
		}

		/**
		 * Address that opens this very site in somebody else's browser.
		 *
		 * The site is the root pawn of a Land of its own, and that Land is readable
		 * by anybody holding its link — so the link is the whole share mechanism,
		 * with nothing to grant and nothing to migrate.
		 */
		@ $mol_mem
		override share_uri() {
			const site = this.store().site()
			if( !site ) return ''
			return this.$.$mol_state_arg.make_link({ site: site.link().land().str })
		}

		/* -------------------------------------------------------------- publish */

		/**
		 * Name of the repository, suggested from the title of the site the first
		 * time the panel is opened and the user's business from then on.
		 */
		name_default() {
			const title = this.store().site()?.Title()?.val() ?? ''
			const name = title.toLowerCase().replace( /[^a-z0-9]+/g, '' ).replace( /^[0-9]+/, '' )
			return name || 'mysite'
		}

		/**
		 * Opens and closes the publishing rail.
		 *
		 * Everything that can suspend is read before anything is written: this
		 * handler is retried when a read of the site comes back as a promise, and a
		 * retry that found the flag already flipped would close the panel it has
		 * just opened.
		 */
		@ $mol_action
		override publish_toggle( next?: any ) {

			if( next === undefined ) return null

			const open = !this.publishing()
			const name = open && !this.publish_name() ? this.name_default() : ''

			if( name ) this.publish_name( name )
			this.publishing( open )

			return null
		}

		/**
		 * The repository the panel would push: the whole site, generated afresh.
		 *
		 * It is computed from the same `publish_name` the panel shows, and that
		 * matters — the module inside the sources and the repository they are
		 * pushed into have to carry one name, or the built bundle lands beside the
		 * page that looks for it.
		 */
		@ $mol_mem
		override publish_files(): Readonly< Record< string, string > > {

			const site = this.store().site()
			if( !site ) return {}

			const name = this.publish_name().trim() || 'mysite'
			const snap = this.$.$bog_figmol_gen_snap.site( site )

			return this.$.$bog_figmol_gen.files( snap, { name } )
		}

		/* ---------------------------------------------------------------- layout */

		/**
		 * Nothing to edit means nothing to show but the offer to start. Reading
		 * the site suspends while the home Land loads, and $mol shows its own
		 * waiting state for that — which is honest, the answer really is unknown.
		 *
		 * A site opened by link keeps the canvas and the panels that only read, so
		 * the visitor can walk the pages and the layers without being offered a
		 * single control that would fail.
		 */
		@ $mol_mem
		override editor_content(): readonly $mol_view[] {

			if( !this.store().site() ) return [ this.Start() ]

			const editable = this.editable()
			const res = [] as $mol_view[]

			if( editable ) res.push( this.Tools() )

			res.push( this.Side(), this.Canvas() )

			if( !editable ) return res

			if( this.publishing() ) res.push( this.Publish() )
			else if( this.selected() ) res.push( this.Inspector() )

			return res
		}

		/**
		 * Middle of what the user is looking at, in sheet pixels — where a block
		 * picked from the palette goes. Measured rather than memoized: a viewport
		 * that has been panned since the last render would give a stale answer.
		 */
		override drop_spot(): readonly number[] {
			return ( this.Canvas() as $.$$.$bog_figmol_app_canvas ).center()
		}

		/* -------------------------------------------------------------- keyboard */

		/**
		 * Shortcuts that have to work wherever the focus is.
		 *
		 * A `$mol_hotkey` plugin listens on the DOM node of its host, and on a cold
		 * load the focus is on `<body>` — above the app, so nothing ever reaches
		 * it. The window hears everything.
		 *
		 * The same registration closes the inline caption editor on a press
		 * outside it: the canvas can only see the presses that land on the canvas,
		 * and a click into the inspector has to close the editor just as well.
		 */
		@ $mol_mem
		listen() {

			const win = this.$.$mol_dom_context

			win.addEventListener( 'keydown', ( event: KeyboardEvent )=> this.key_down( event ) )
			win.addEventListener( 'pointerdown', ( event: PointerEvent )=> this.press_down( event ) )

			return null
		}

		/** Whether the keys are going into a field rather than to the editor. */
		typing( target: EventTarget | null ) {
			const node = target as Element | null
			if( !node?.closest ) return false
			return !!node.closest( figmol_app_fields )
		}

		key_down( event: KeyboardEvent ) {

			if( event.defaultPrevented ) return
			if( this.typing( event.target ) ) return

			const command = event.metaKey || event.ctrlKey

			// Zoom is about looking rather than editing, so it works on a site
			// opened by somebody else's link just as well.
			if( this.zoom_key( event, command ) ) return

			if( !this.editable() ) return

			if( command && event.code === 'KeyZ' ) {
				event.preventDefault()
				$mol_wire_async( this ).step( event.shiftKey )
				return
			}

			// Windows spells redo the other way round, and both spellings cost
			// nothing to support.
			if( command && event.code === 'KeyY' ) {
				event.preventDefault()
				$mol_wire_async( this ).step( true )
				return
			}

			if( command && event.code === 'KeyD' ) {
				event.preventDefault()
				$mol_wire_async( this ).duplicate()
				return
			}

			if( command ) return
			if( !figmol_app_arrows.includes( event.code ) ) return
			if( !this.selection().length ) return

			event.preventDefault()

			const far = event.shiftKey ? figmol_app_nudge_far : figmol_app_nudge
			const shift_x = event.code === 'ArrowLeft' ? -far : event.code === 'ArrowRight' ? far : 0
			const shift_y = event.code === 'ArrowUp' ? -far : event.code === 'ArrowDown' ? far : 0

			$mol_wire_async( this ).nudge( shift_x, shift_y )
		}

		/**
		 * Zoom shortcuts, spelled the way every editor spells them: `⇧1` fits the
		 * page into the window, `⌘0` goes back to life size, `⌘+` and `⌘-` step
		 * about the middle of what is on screen.
		 *
		 * Answers whether the key was one of its own, so the caller can stop.
		 */
		zoom_key( event: KeyboardEvent, command: boolean ) {

			const canvas = this.Canvas() as $.$$.$bog_figmol_app_canvas

			if( !command && event.shiftKey && event.code === 'Digit1' ) {
				event.preventDefault()
				$mol_wire_async( canvas ).zoom_fit()
				return true
			}

			if( !command ) return false

			// The plus key is `Equal` unshifted and there is a numeric keypad as
			// well, so all four spellings answer to the same thing.
			if( event.code === 'Digit0' || event.code === 'Numpad0' ) {
				event.preventDefault()
				$mol_wire_async( canvas ).zoom_reset()
				return true
			}

			if( event.code === 'Equal' || event.code === 'NumpadAdd' ) {
				event.preventDefault()
				$mol_wire_async( canvas ).zoom_step( 1 )
				return true
			}

			if( event.code === 'Minus' || event.code === 'NumpadSubtract' ) {
				event.preventDefault()
				$mol_wire_async( canvas ).zoom_step( -1 )
				return true
			}

			return false
		}

		/** A press anywhere but inside the caption being typed ends the typing. */
		press_down( event: PointerEvent ) {
			const node = event.target as Element | null
			if( node?.closest?.( '[figmol_edit]' ) ) return
			if( !this.Canvas().editing() ) return
			$mol_wire_async( this.Canvas() ).editing( '' )
		}

		/**
		 * One step through the journal, back or forward.
		 *
		 * Taking an insertion back unlinks the very node the inspector is showing,
		 * and a panel describing an element nobody can see any more is worse than
		 * no panel — so the selection is dropped when it points at nothing.
		 */
		@ $mol_action
		step( forward: boolean ) {

			const store = this.store()

			if( forward ) store.redo()
			else store.undo()

			const alive = store.node_ids()
			const kept = this.selection().filter( id => alive.includes( id ) )

			if( kept.length !== this.selection().length ) this.selection( kept )
		}

		/**
		 * Copies everything selected, subtrees and all, and selects the copies —
		 * which is what makes the next ⌘D copy the copies rather than the
		 * originals.
		 */
		@ $mol_action
		duplicate() {

			const store = this.store()
			const made = [] as string[]

			store.group( ()=> {
				for( const id of this.selection() ) {
					const copy = store.node_copy( id )
					if( copy ) made.push( copy )
				}
			} )

			if( made.length ) this.selection( made )
		}

		/**
		 * Lines the selection up, or spreads it out — whichever the inspector
		 * asked for.
		 *
		 * Where the elements are is measured off the screen and not read out of
		 * the document: two of them may sit in different frames, and one of those
		 * frames may lay its children out itself, in which case the coordinates
		 * stored on them say nothing. The canvas knows where a node ended up, so
		 * every rectangle is taken to the sheet through the origin of its own
		 * parent and written back through the same one.
		 *
		 * Elements placed by an auto layout are left out entirely: a coordinate
		 * written for them would be overruled by the frame that holds them.
		 *
		 * The whole strip is one gesture, so it costs one step back.
		 */
		@ $mol_action
		override arrange( next?: string ) {

			if( next === undefined ) return ''

			const store = this.store()
			const canvas = this.Canvas() as $.$$.$bog_figmol_app_canvas

			const ids = this.selection().filter( id => !store.flow( id ) )
			if( ids.length < 2 ) return ''

			const origins = ids.map( id => canvas.node_origin( store.parent( id ) ) )

			const boxes = ids.map( ( id, at )=> {
				const rect = store.rect( id )
				return [ origins[ at ][ 0 ] + rect[ 0 ], origins[ at ][ 1 ] + rect[ 1 ], rect[ 2 ], rect[ 3 ] ]
			} )

			const spots = $bog_figmol_app_arrange.place( next, boxes )

			store.group( ()=> {
				spots.forEach( ( spot, at )=> {
					store.x( ids[ at ], spot[ 0 ] - origins[ at ][ 0 ] )
					store.y( ids[ at ], spot[ 1 ] - origins[ at ][ 1 ] )
				} )
			} )

			return ''
		}

		/**
		 * Moves the selection by the arrow keys. An element inside an auto layout
		 * is placed by its frame, so there is nothing here to move.
		 */
		@ $mol_action
		nudge( shift_x: number, shift_y: number ) {

			const store = this.store()

			store.group( ()=> {

				for( const id of this.selection() ) {

					if( store.flow( id ) ) continue

					if( shift_x ) store.x( id, store.x( id ) + shift_x )
					if( shift_y ) store.y( id, store.y( id ) + shift_y )

				}

			} )
		}

	}

}
