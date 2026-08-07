namespace $.$$ {

	const figmol_size_min = 8
	const figmol_zoom_min = 0.1
	const figmol_zoom_max = 4

	/** One press of ⌘+ or ⌘-. */
	const figmol_zoom_step = 1.25

	/** Air left around the page when it is fitted into the window. */
	const figmol_fit_gap = 48

	/** Slack in screen pixels below which a press counts as a click, not a drag. */
	const figmol_slack = 3

	/**
	 * How close, in screen pixels, an edge has to come to a neighbour before it
	 * sticks to it. Screen rather than sheet pixels on purpose: this is about how
	 * precisely a hand can aim, which has nothing to do with the zoom.
	 */
	const figmol_snap = 6

	/** Room the context menu needs, so it opens inwards near an edge. */
	const figmol_menu = [ 210, 210 ]

	/** Kinds whose caption a double click opens for typing, right on the canvas. */
	const figmol_captioned = [ 'text', 'button', 'bui_button', 'bui_badge', 'bui_alert' ]

	/** Where a field is being typed into, and the canvas keeps its hands off. */
	const figmol_fields = 'input, textarea, [contenteditable="true"]'

	/** Rectangles a gesture draws right now, by node. */
	type Draft = Readonly< Record< string, readonly number[] > >

	type Point = {
		clientX: number,
		clientY: number,
	}

	/**
	 * The editing surface.
	 *
	 * Two coordinate systems meet here. Nodes are stored in sheet pixels; the
	 * viewport adds `pan` (screen pixels) and `zoom` on top through a single CSS
	 * transform on `World`. Every conversion goes through `sheet_point`, which
	 * measures the sheet element and therefore stays correct no matter how the
	 * page around the canvas is laid out.
	 *
	 * Shapes are a tree in the DOM and a flat keyed factory here: `Shape( id )`
	 * makes one view per node wherever that node sits, and a frame gets its kid
	 * views handed to it. Selection, editing and the drag in progress therefore
	 * stay in one object instead of being threaded down every nesting level.
	 *
	 * Dragging is deliberately split in two: the live rectangles sit in the
	 * `draft` atom so that a pointermove costs one repaint, and only pointerup
	 * writes them into the Baza. Writing on every move would turn a single drag
	 * into hundreds of CRDT units.
	 *
	 * The press decides which of four gestures is going on — pan, move, resize
	 * or rubber band — and everything after it only carries that one out.
	 */
	export class $bog_figmol_app_canvas extends $.$bog_figmol_app_canvas {

		/**
		 * Keeps the window listeners up for as long as the canvas is mounted.
		 * `listen` is memoized, so they are hooked up once.
		 */
		override auto() {
			this.listen()
			super.auto()
		}

		/* -------------------------------------------------------------- shapes */

		/**
		 * The page, plus the rubber band while one is being pulled. Whether the
		 * band is there is asked as a flag rather than read off the band itself:
		 * this list would otherwise be rebuilt on every move of the pointer.
		 */
		@ $mol_mem
		override shapes(): readonly $mol_view[] {
			const res = [ ... this.shape_kids( this.store().root_id() ) ] as $mol_view[]
			if( this.marquee_on() ) res.push( this.Marquee() )
			return res
		}

		@ $mol_mem
		marquee_on() {
			return !!this.marquee()
		}

		shape_id( id: string ) {
			return id
		}

		@ $mol_mem_key
		shape_kids( id: string ): readonly $mol_view[] {
			return this.store().kids( id ).map( kid => this.Shape( kid ) )
		}

		@ $mol_mem_key
		shape_selected( id: string ) {
			return this.selection().includes( id )
		}

		/**
		 * Grips are drawn for a single element only. Several at once would need a
		 * box around the lot of them and a resize that divides itself up between
		 * them — worth doing, and not by pretending each one is alone.
		 */
		@ $mol_mem_key
		shape_grips( id: string ) {
			return this.selection().length === 1 && this.shape_selected( id )
		}

		@ $mol_mem_key
		shape_editing( id: string ) {
			return this.editing() === id
		}

		@ $mol_mem_key
		shape_dropping( id: string ) {
			return this.drop_target() === id
		}

		/** Live rectangle while dragging, stored one otherwise. */
		@ $mol_mem_key
		shape_rect( id: string ): readonly number[] {
			return this.draft()?.[ id ] ?? this.store().rect( id )
		}

		/** Rectangles the gesture is drawing, alive only during a drag. */
		@ $mol_mem
		draft( next?: Draft | null ) {
			return next ?? null
		}

		/** Frame the current drag would drop into. Empty means the sheet itself. */
		@ $mol_mem
		drop_target( next?: string ) {
			return next ?? ''
		}

		/**
		 * The rubber band, as the two sheet points it was dragged between —
		 * unordered, since the drag may go in any direction.
		 */
		@ $mol_mem
		marquee( next?: readonly number[] | null ) {
			return next ?? null
		}

		/** The same band as left, top, width, height. */
		marquee_box(): readonly number[] {
			const band = this.marquee()
			if( !band ) return [ 0, 0, 0, 0 ]
			return [
				Math.min( band[ 0 ], band[ 2 ] ),
				Math.min( band[ 1 ], band[ 3 ] ),
				Math.abs( band[ 2 ] - band[ 0 ] ),
				Math.abs( band[ 3 ] - band[ 1 ] ),
			]
		}

		marquee_left() {
			return this.marquee_box()[ 0 ] + 'px'
		}

		marquee_top() {
			return this.marquee_box()[ 1 ] + 'px'
		}

		marquee_width() {
			return this.marquee_box()[ 2 ] + 'px'
		}

		marquee_height() {
			return this.marquee_box()[ 3 ] + 'px'
		}

		/* --------------------------------------------------------------- overlay */

		/**
		 * Everything drawn over the sheet instead of on it: the guides a drag has
		 * stuck to, the rulers between the box and its neighbours, the frame
		 * around several elements, and the context menu.
		 *
		 * All four are read here unconditionally even when nothing is shown. A
		 * `@$mol_mem` cell keeps its value only while somebody is subscribed to
		 * it, and this render is the one permanent subscriber they have — reading
		 * them behind an `if` would leave the ones that are off without a reader,
		 * and the handler writing such a cell would find it reset a moment later.
		 */
		@ $mol_mem
		overlay(): readonly $mol_view[] {

			const guide_x = this.guide_x()
			const guide_y = this.guide_y()
			const measures = this.measure_ids()
			const group = this.group_on()
			const menu = this.menu_on()

			const res = [] as $mol_view[]

			if( guide_x !== null ) res.push( this.Guide_x() )
			if( guide_y !== null ) res.push( this.Guide_y() )

			for( const id of measures ) res.push( this.Measure( id ) )

			if( group ) res.push( this.Group() )
			if( menu ) res.push( this.Menu() )

			return res
		}

		/** Sheet coordinate as a screen one, inside the canvas box. */
		screen_x( sheet_x: number ) {
			return this.pan_x() + sheet_x * this.zoom()
		}

		screen_y( sheet_y: number ) {
			return this.pan_y() + sheet_y * this.zoom()
		}

		/** Where the drag has stuck, in sheet pixels. `null` means it has not. */
		@ $mol_mem
		guide_x( next?: number | null ) {
			return next ?? null
		}

		@ $mol_mem
		guide_y( next?: number | null ) {
			return next ?? null
		}

		guide_x_left() {
			return this.screen_x( this.guide_x() ?? 0 ) - 0.5 + 'px'
		}

		guide_x_top() {
			return this.screen_y( 0 ) + 'px'
		}

		guide_x_height() {
			return this.sheet_height() * this.zoom() + 'px'
		}

		guide_y_top() {
			return this.screen_y( this.guide_y() ?? 0 ) - 0.5 + 'px'
		}

		guide_y_left() {
			return this.screen_x( 0 ) + 'px'
		}

		guide_y_width() {
			return this.sheet_width() * this.zoom() + 'px'
		}

		/** Distances worth showing right now, in sheet pixels. */
		@ $mol_mem
		measures( next?: readonly $bog_figmol_magnet_gap[] | null ) {
			return next ?? null
		}

		@ $mol_mem
		measure_ids(): readonly string[] {
			return ( this.measures() ?? [] ).map( ( gap, at )=> String( at ) )
		}

		measure( id: string ) {
			return this.measures()?.[ Number( id ) ] ?? null
		}

		/**
		 * A ruler is a hairline: it is as long as the gap along its own axis and a
		 * single pixel across, and that pixel is centred on the line it marks.
		 */
		measure_left( id: string ) {
			const gap = this.measure( id )
			const at = this.screen_x( gap?.x ?? 0 )
			return ( gap?.row ? at : at - 0.5 ) + 'px'
		}

		measure_top( id: string ) {
			const gap = this.measure( id )
			const at = this.screen_y( gap?.y ?? 0 )
			return ( gap?.row ? at - 0.5 : at ) + 'px'
		}

		measure_width( id: string ) {
			const gap = this.measure( id )
			return gap?.row ? gap.size * this.zoom() + 'px' : '1px'
		}

		measure_height( id: string ) {
			const gap = this.measure( id )
			return gap && !gap.row ? gap.size * this.zoom() + 'px' : '1px'
		}

		measure_text( id: string ) {
			return String( Math.round( this.measure( id )?.size ?? 0 ) )
		}

		/* ------------------------------------------------------------ measuring */

		@ $mol_mem
		armed() {
			return this.editable() && this.tool() !== 'select'
		}

		/** Space is held, so the next drag pans instead of selecting. */
		@ $mol_mem
		grabbing() {
			return this.space()
		}

		@ $mol_mem
		world_transform() {
			return `translate(${ this.pan_x() }px, ${ this.pan_y() }px) scale(${ this.zoom() })`
		}

		@ $mol_mem
		sheet_width_style() {
			return this.sheet_width() + 'px'
		}

		@ $mol_mem
		sheet_height_style() {
			return this.sheet_height() + 'px'
		}

		/** The visible area of the canvas itself, in screen pixels. */
		viewport() {
			return ( this.dom_node() as HTMLElement ).getBoundingClientRect()
		}

		/**
		 * Middle of the visible area, in sheet pixels.
		 *
		 * This is where a block picked from the palette goes — no pointer told it
		 * where, and the middle of what the user is looking at beats a fixed corner
		 * of a sheet that may be scrolled far away. Measured on the spot rather
		 * than memoized: panning does not repaint anything, so a remembered answer
		 * would go stale without ever being invalidated.
		 */
		center(): readonly number[] {

			const node = $mol_wire_probe( ()=> this.dom_node() ) as HTMLElement | undefined
			if( !node ) return [ 0, 0 ]

			const rect = node.getBoundingClientRect()

			return this.sheet_point({
				clientX: rect.left + rect.width / 2,
				clientY: rect.top + rect.height / 2,
			})
		}

		/**
		 * Scale the sheet is drawn at right now, which is not always what `zoom`
		 * says: a write into the atom reaches the screen a frame later, and
		 * anything measured off the DOM in between would be read against a
		 * transform that is not on it yet. Taken from the sheet itself, both
		 * halves of every such measurement come from the same layout.
		 */
		zoom_live() {
			const width = this.sheet_width()
			if( !width ) return this.zoom()
			const rect = this.Sheet().dom_node().getBoundingClientRect()
			return rect.width ? rect.width / width : this.zoom()
		}

		/** Client point in sheet coordinates. */
		sheet_point( event: Point ) {
			const rect = this.Sheet().dom_node().getBoundingClientRect()
			const zoom = this.zoom_live()
			return [
				( event.clientX - rect.left ) / zoom,
				( event.clientY - rect.top ) / zoom,
			]
		}

		/**
		 * Element of a shape that is already on screen, `null` otherwise. Probed
		 * rather than asked for: `dom_node()` would happily build a detached node
		 * for a shape nobody rendered, and measuring that gives zeroes.
		 */
		shape_dom( id: string ) {
			if( !id ) return null
			const shape = this.Shape( id )
			return $mol_wire_probe( ()=> shape.dom_node() ) as HTMLElement | undefined ?? null
		}

		/**
		 * Top-left of a node in sheet pixels, measured from the DOM. Asking the
		 * node itself would only work outside an auto layout — inside one the
		 * coordinates are the layout's business, and this is the way to learn
		 * where an element actually ended up.
		 */
		node_origin( id: string ): readonly number[] {
			if( !id || id === this.store().root_id() ) return [ 0, 0 ]
			const node = this.shape_dom( id )
			if( !node ) return [ 0, 0 ]
			const rect = node.getBoundingClientRect()
			const sheet = this.Sheet().dom_node().getBoundingClientRect()
			const zoom = this.zoom_live()
			return [ ( rect.left - sheet.left ) / zoom, ( rect.top - sheet.top ) / zoom ]
		}

		/**
		 * The same top-left, worked out from the frame around the node and the
		 * node's own coordinates wherever that is possible.
		 *
		 * Measuring is only the right answer inside an auto layout, where the
		 * coordinates say nothing. Everywhere else it is the worse one: a copy
		 * made a moment ago by an Alt drag has no element on screen yet, and
		 * measuring one that is not there gives the corner of the sheet.
		 */
		node_place( id: string ): readonly number[] {

			const store = this.store()
			if( store.flow( id ) ) return this.node_origin( id )

			const rect = this.shape_rect( id )
			const origin = this.node_origin( store.parent( id ) )

			return [ origin[ 0 ] + rect[ 0 ], origin[ 1 ] + rect[ 1 ] ]
		}

		/**
		 * Rectangle of a node in sheet pixels, counted from the sheet rather than
		 * from the frame it sits in — the one coordinate system snapping, rulers
		 * and the group frame all speak, since a selection may span frames.
		 */
		node_rect( id: string ): readonly number[] {
			const rect = this.shape_rect( id )
			const place = this.node_place( id )
			return [ place[ 0 ], place[ 1 ], rect[ 2 ], rect[ 3 ] ]
		}

		/**
		 * Deepest container under the pointer, empty for the sheet itself. Everything
		 * at or below `held` is skipped: a frame cannot be dropped into itself.
		 * Depth decides rather than z-order, so a frame inside a frame wins.
		 */
		frame_at( point: Point, held: string ) {

			const store = this.store()
			let res = ''
			let deepest = -1

			for( const id of store.node_ids() ) {

				if( !store.container( id ) ) continue
				if( held && store.inside( id, held ) ) continue

				const node = this.shape_dom( id )
				if( !node ) continue

				const rect = node.getBoundingClientRect()
				if( point.clientX < rect.left || point.clientX > rect.right ) continue
				if( point.clientY < rect.top || point.clientY > rect.bottom ) continue

				const depth = store.depth( id )
				if( depth <= deepest ) continue

				deepest = depth
				res = id

			}

			return res
		}

		/**
		 * Where the pointer sits among the kids of a frame. Only an auto layout
		 * cares about the answer — free placement appends, since order there means
		 * nothing but which shape draws on top.
		 */
		drop_index( parent: string, point: Point, held: string ) {

			const store = this.store()
			const kids = store.kids( parent )

			if( !store.auto_layout( parent ) ) return kids.length

			const row = store.direction( parent ) === 'row'
			const along = row ? point.clientX : point.clientY
			let res = 0

			for( const kid of kids ) {

				if( kid === held ) continue

				const node = this.shape_dom( kid )
				if( !node ) continue

				const rect = node.getBoundingClientRect()
				const center = row ? ( rect.left + rect.right ) / 2 : ( rect.top + rect.bottom ) / 2
				if( along > center ) ++res

			}

			return res
		}

		/* ------------------------------------------------------------ selection */

		/**
		 * Frame the clicks are currently inside — the one a double click went
		 * into. Empty means the page itself.
		 *
		 * A plain field like the rest of the gesture state below, and for the same
		 * reason: nothing draws this, so the only reader is a handler, and a
		 * `@$mol_mem` cell whose last subscriber was the fiber of the previous
		 * event resets to its default the moment that fiber is killed — which is
		 * on the very next press.
		 */
		scope_id = ''

		scope( next?: string ) {
			if( next !== undefined ) this.scope_id = next
			return this.scope_id
		}

		/** The same, forgotten once the frame it names is gone from the page. */
		scope_now() {
			const id = this.scope()
			if( !id ) return ''
			return this.store().node_ids().includes( id ) ? id : ''
		}

		/** Ancestor of `id` that sits directly in `host`, empty when it is elsewhere. */
		child_of( host: string, id: string ) {

			const store = this.store()
			if( !id || id === host ) return ''

			for( let cursor = id; cursor; cursor = store.parent( cursor ) ) {
				if( store.parent( cursor ) === host ) return cursor
			}

			return ''
		}

		/**
		 * What a press on a shape picks out of the whole stack under the pointer.
		 *
		 * A plain click takes the topmost element of the level being edited — the
		 * page itself, or the frame a double click has gone into — so that a card
		 * moves as one thing rather than falling apart into captions. ⌘ takes
		 * whatever is deepest, for the times when that is exactly the point.
		 *
		 * Clicking outside the frame that was entered leaves it, the way stepping
		 * out of a group does everywhere.
		 */
		pick( deep: string, event: { metaKey: boolean, ctrlKey: boolean } ) {

			if( !deep ) return ''
			if( event.metaKey || event.ctrlKey ) return deep

			const store = this.store()
			const scope = this.scope_now()
			const inside = scope && store.inside( deep, scope )

			if( scope && !inside ) this.scope( '' )

			const host = ( inside ? scope : '' ) || store.root_id()

			return this.child_of( host, deep ) || deep
		}

		@ $mol_action
		toggle( id: string ) {
			const ids = this.selection()
			this.selection( ids.includes( id ) ? ids.filter( other => other !== id ) : [ ... ids, id ] )
		}

		/** Nodes the rubber band touches, among the children of the current level. */
		marquee_hits( band: readonly number[] ): readonly string[] {

			const store = this.store()
			const host = this.scope_now() || store.root_id()
			if( !host ) return []

			const sheet = this.Sheet().dom_node().getBoundingClientRect()
			const zoom = this.zoom_live()

			const left = sheet.left + Math.min( band[ 0 ], band[ 2 ] ) * zoom
			const right = sheet.left + Math.max( band[ 0 ], band[ 2 ] ) * zoom
			const top = sheet.top + Math.min( band[ 1 ], band[ 3 ] ) * zoom
			const bottom = sheet.top + Math.max( band[ 1 ], band[ 3 ] ) * zoom

			return store.kids( host ).filter( id => {

				const node = this.shape_dom( id )
				if( !node ) return false

				const rect = node.getBoundingClientRect()

				return rect.right >= left && rect.left <= right
					&& rect.bottom >= top && rect.top <= bottom

			} )
		}

		/* --------------------------------------------------------- group frame */

		/**
		 * Box around everything picked, in sheet pixels — what the frame with the
		 * group grips is drawn as, and what a group resize scales.
		 *
		 * While a gesture is running, the box that gesture is drawing is the
		 * answer. Measuring the elements again would describe the layout as it
		 * was before this move: the shapes and this frame are two independent
		 * atoms, and nothing says the shapes are repainted first.
		 */
		@ $mol_mem
		group_box(): readonly number[] {

			const live = this.drag_box()
			if( live ) return live

			const ids = this.selection()
			if( ids.length < 2 ) return []

			return $bog_figmol_magnet.bbox( ids.map( id => this.node_rect( id ) ) )
		}

		/** Box the gesture is drawing right now, `null` between gestures. */
		@ $mol_mem
		drag_box( next?: readonly number[] | null ) {
			return next ?? null
		}

		group_on() {
			return this.group_box().length > 0
		}

		group_left() {
			return this.screen_x( this.group_box()[ 0 ] ?? 0 ) + 'px'
		}

		group_top() {
			return this.screen_y( this.group_box()[ 1 ] ?? 0 ) + 'px'
		}

		group_width() {
			return ( this.group_box()[ 2 ] ?? 0 ) * this.zoom() + 'px'
		}

		group_height() {
			return ( this.group_box()[ 3 ] ?? 0 ) * this.zoom() + 'px'
		}

		/* ----------------------------------------------------- pointer gesture */

		/**
		 * Gesture state is kept in plain fields on purpose. A `@$mol_mem` cell
		 * read by several handlers resets to its default between events: every
		 * handler is a fresh fiber and killing the previous one drops the only
		 * subscriber of the cell.
		 */
		mode = '' as '' | 'pan' | 'move' | 'resize' | 'scale' | 'marquee'
		grab_id = ''
		grab_ids = [] as readonly string[]
		grab_corner = ''
		grab_x = 0
		grab_y = 0
		last_x = 0
		last_y = 0
		grab_rects = {} as Record< string, readonly number[] >
		grab_flows = {} as Record< string, boolean >
		grab_sheets = {} as Record< string, readonly number[] >
		grab_pan = [ 0, 0 ] as readonly number[]

		/** What the gesture can stick to, measured once at the press — see `snap_arm`. */
		grab_box = [ 0, 0, 0, 0 ] as readonly number[]
		grab_origin = [ 0, 0 ] as readonly number[]
		grab_boxes = [] as readonly ( readonly number[] )[]
		grab_lines_x = [] as readonly number[]
		grab_lines_y = [] as readonly number[]
		grab_limit = 0

		/** Move the drag has drawn so far, in sheet pixels, snapping included. */
		grab_shift = [ 0, 0 ] as readonly number[]

		/** Node the press resolved to, and whether it was one of several picked. */
		grab_pick = ''
		grab_group = false

		/** Selection a shift-dragged rubber band adds to. */
		grab_base = [] as readonly string[]

		/** Deepest node under the last press — what the double click after it means. */
		press_deep = ''

		/** Whether the pointer has travelled far enough for this to be a drag. */
		moved() {
			return Math.abs( this.last_x - this.grab_x ) > figmol_slack
				|| Math.abs( this.last_y - this.grab_y ) > figmol_slack
		}

		@ $mol_action
		pointer_down( event?: PointerEvent ) {

			if( !event ) return null
			if( !event.isPrimary ) return null

			const host = event.currentTarget as HTMLElement
			const target = event.target as Element

			// A press inside the inline editor belongs to the editor: no capture,
			// no default prevented, so the caret lands where it was clicked.
			if( target.closest( '[figmol_edit]' ) ) return null

			// The same goes for the context menu. Capturing the pointer here would
			// retarget the click onto the canvas, and the item pressed would never
			// hear about it.
			if( target.closest( '[figmol_menu]' ) ) return null

			this.grab_x = event.clientX
			this.grab_y = event.clientY
			this.last_x = event.clientX
			this.last_y = event.clientY
			this.mode = ''
			this.grab_id = ''
			this.grab_ids = []
			this.grab_group = false

			const tool = this.tool()

			if( event.button === 0 && this.editable() && tool !== 'select' ) {
				event.preventDefault()
				this.node_add( tool, event )
				this.tool( 'select' )
				return null
			}

			const handle = target.closest( '[figmol_handle]' )
			const shape = target.closest( '[figmol_node]' )
			const deep = shape?.getAttribute( 'figmol_node' ) ?? ''

			this.press_deep = deep

			// The right button opens the menu, and the event that does so comes
			// after this one. Nothing is captured and nothing is prevented: this
			// press has to leave the page exactly as the menu will find it.
			if( event.button === 2 ) return null

			event.preventDefault()

			// Capture keeps the moves coming when the pointer leaves the canvas.
			// It refuses a pointer that is no longer down, which is a race rather
			// than a mistake — the gesture still works through plain bubbling.
			try {
				host.setPointerCapture( event.pointerId )
			} catch( error ) {
				$mol_fail_log( error )
			}

			host.focus()

			if( this.editing() ) this.editing( '' )

			// Panning is a gesture of its own — the middle button, or space held
			// down, as everywhere else. The plain drag belongs to the selection.
			if( event.button !== 0 || this.space() ) {
				this.pan_start()
				return null
			}

			// A grip with no shape around it hangs off the frame drawn around
			// several elements, which lives beside the sheet rather than on it.
			if( handle && !deep ) {
				this.press_scale( handle.getAttribute( 'figmol_handle' ) ?? '' )
				return null
			}

			// A grip belongs to the shape it hangs off, whatever the click rules
			// would have picked at that spot.
			const corner = handle?.getAttribute( 'figmol_handle' ) ?? ''
			const id = handle ? deep : this.pick( deep, event )

			if( id ) {
				this.press_pick( id, corner, event )
				if( this.editable() ) return null
			}

			if( !id && !event.shiftKey ) this.selection([])

			// An empty spot pulls a rubber band for somebody who has something to
			// select, and pans for a visitor who only reads.
			if( !id && this.editable() ) {
				const point = this.sheet_point( event )
				this.mode = 'marquee'
				this.grab_base = event.shiftKey ? this.selection() : []
				this.marquee([ point[ 0 ], point[ 1 ], point[ 0 ], point[ 1 ] ])
				return null
			}

			this.pan_start()

			return null
		}

		@ $mol_action
		pan_start() {
			this.mode = 'pan'
			this.grab_pan = [ this.pan_x(), this.pan_y() ]
		}

		/**
		 * A press on a shape: what it does to the selection, and what gesture it
		 * starts.
		 *
		 * Pressing one member of a group keeps the group — that is how several
		 * things are dragged at once — and the click that turns out not to be a
		 * drag narrows it down later, in `pointer_up`.
		 */
		@ $mol_action
		press_pick( id: string, corner: string, event: PointerEvent ) {

			const held = this.selection().includes( id )
			const many = this.selection().length > 1

			if( event.shiftKey && !corner ) this.toggle( id )
			else if( !held ) this.selection([ id ])

			this.grab_pick = id
			this.grab_group = many && held && !event.shiftKey

			if( !this.editable() ) return
			if( event.shiftKey && !corner ) return

			if( corner ) {
				this.mode = 'resize'
				this.grab_corner = corner
				this.grab_take([ id ])
				return
			}

			this.mode = 'move'
			this.grab_take( event.altKey ? this.clone( this.selection() ) : this.selection() )
		}

		/**
		 * A press on a grip of the frame drawn around several elements: everything
		 * inside it is about to be scaled together.
		 *
		 * Elements an auto layout places are left out. Their frame decides where
		 * they go and how wide they are, and a scale that wrote coordinates there
		 * would be overruled the moment it finished.
		 */
		@ $mol_action
		press_scale( corner: string ) {

			if( !this.editable() ) return
			if( !corner ) return

			const store = this.store()
			const ids = this.selection().filter( id => !store.flow( id ) )

			if( ids.length < 2 ) return

			this.mode = 'scale'
			this.grab_corner = corner
			this.grab_take( ids )
		}

		/** Remembers where everything about to be dragged started out. */
		grab_take( ids: readonly string[] ) {

			const store = this.store()

			this.grab_ids = ids
			this.grab_id = ids[ ids.length - 1 ] ?? ''
			this.grab_rects = {}
			this.grab_flows = {}
			this.grab_sheets = {}
			this.grab_shift = [ 0, 0 ]

			for( const id of ids ) {
				this.grab_rects[ id ] = this.shape_rect( id )
				this.grab_flows[ id ] = store.flow( id )
				this.grab_sheets[ id ] = this.node_place( id )
			}

			this.snap_arm( ids )
		}

		/**
		 * Remembers what the gesture about to start can stick to: the neighbours
		 * at the level being dragged on, and the frame around them — the sheet
		 * itself, when that level is the page.
		 *
		 * Measured once, here, rather than on every move. Nothing but the dragged
		 * nodes moves during a gesture, so the answer cannot change; measuring it
		 * again on each pointer move would cost a forced layout per neighbour per
		 * frame, and that is the one thing a drag cannot afford.
		 *
		 * An auto layout places its children itself: a drag inside one is about
		 * their order and not their coordinates, so there is nothing there worth
		 * sticking to and the lists are left empty.
		 */
		snap_arm( ids: readonly string[] ) {

			const store = this.store()
			const magnet = $bog_figmol_magnet

			this.grab_lines_x = []
			this.grab_lines_y = []
			this.grab_boxes = []
			this.grab_limit = figmol_snap / ( this.zoom_live() || 1 )

			this.grab_box = magnet.bbox( ids.map( id => {
				const place = this.grab_sheets[ id ] ?? [ 0, 0 ]
				const rect = this.grab_rects[ id ] ?? [ 0, 0, 0, 0 ]
				return [ place[ 0 ], place[ 1 ], rect[ 2 ], rect[ 3 ] ]
			} ) )

			// Where the frame of the first grabbed node has its own corner, so a
			// rectangle worked out against the sheet can be written back into the
			// coordinates the node is actually stored in.
			const local = this.grab_rects[ ids[ 0 ] ] ?? [ 0, 0, 0, 0 ]
			const place = this.grab_sheets[ ids[ 0 ] ] ?? [ 0, 0 ]
			this.grab_origin = [ place[ 0 ] - local[ 0 ], place[ 1 ] - local[ 1 ] ]

			const root = store.root_id()
			const host = store.parent( ids[ 0 ] ) || root

			if( store.auto_layout( host ) ) return

			const boxes = [] as ( readonly number[] )[]

			for( const id of store.kids( host ) ) {
				if( ids.includes( id ) ) continue
				const rect = this.node_rect( id )
				boxes.push( rect )
			}

			this.grab_boxes = boxes

			const frame = host && host !== root
				? this.node_rect( host )
				: [ 0, 0, this.sheet_width(), this.sheet_height() ]

			this.grab_lines_x = magnet.lines([ ... boxes, frame ], 0 )
			this.grab_lines_y = magnet.lines([ ... boxes, frame ], 1 )
		}

		/**
		 * The move the pointer asked for, corrected so an edge or the middle of
		 * the box being dragged lands exactly on a neighbour. Puts up the guides
		 * that show what it landed on, and the rulers to whatever it now stands
		 * next to.
		 */
		snap_move( move_x: number, move_y: number ): readonly number[] {

			const magnet = $bog_figmol_magnet
			const box = this.grab_box

			const hit_x = magnet.snap(
				magnet.probes( box[ 0 ] + move_x, box[ 2 ] ),
				this.grab_lines_x,
				this.grab_limit,
			)

			const hit_y = magnet.snap(
				magnet.probes( box[ 1 ] + move_y, box[ 3 ] ),
				this.grab_lines_y,
				this.grab_limit,
			)

			this.guide_x( hit_x?.line ?? null )
			this.guide_y( hit_y?.line ?? null )

			const res = [ move_x + ( hit_x?.shift ?? 0 ), move_y + ( hit_y?.shift ?? 0 ) ]

			this.measure_show([ box[ 0 ] + res[ 0 ], box[ 1 ] + res[ 1 ], box[ 2 ], box[ 3 ] ])

			return res
		}

		/**
		 * The box a resize is drawing, corrected the same way — but only by the
		 * edges the grip actually moves. A snap that would squeeze the box past
		 * its floor is dropped: sticking to a neighbour is worth less than the
		 * size the user is left with.
		 */
		snap_edges( box: readonly number[], corner: string ): readonly number[] {

			const magnet = $bog_figmol_magnet

			let [ x, y, w, h ] = box

			const west = corner.includes( 'w' )
			const east = corner.includes( 'e' )
			const north = corner.includes( 'n' )
			const south = corner.includes( 's' )

			const hit_x = west || east
				? magnet.snap([ west ? x : x + w ], this.grab_lines_x, this.grab_limit )
				: null

			const hit_y = north || south
				? magnet.snap([ north ? y : y + h ], this.grab_lines_y, this.grab_limit )
				: null

			const wide = hit_x ? w + ( west ? -hit_x.shift : hit_x.shift ) : w
			const tall = hit_y ? h + ( north ? -hit_y.shift : hit_y.shift ) : h

			const took_x = !!hit_x && wide >= figmol_size_min
			const took_y = !!hit_y && tall >= figmol_size_min

			if( took_x ) {
				if( west ) x += hit_x!.shift
				w = wide
			}

			if( took_y ) {
				if( north ) y += hit_y!.shift
				h = tall
			}

			this.guide_x( took_x ? hit_x!.line : null )
			this.guide_y( took_y ? hit_y!.line : null )

			this.measure_show([ x, y, w, h ])

			return [ x, y, w, h ]
		}

		/** Distances from the box a gesture is drawing to what stands around it. */
		measure_show( box: readonly number[] ) {
			const gaps = $bog_figmol_magnet.gaps( box, this.grab_boxes, false )
			this.measures( gaps.length ? gaps : null )
		}

		/**
		 * Alt held over another element, with nothing being dragged: the distances
		 * between what is picked and what the pointer is over. The one way to ask
		 * how far apart two things are without moving either of them.
		 */
		measure_hover( event: PointerEvent ) {

			const shown = this.measures()

			if( !event.altKey ) {
				if( shown ) this.measures( null )
				return
			}

			const ids = this.selection()
			const target = event.target as Element
			const over = target.closest( '[figmol_node]' )?.getAttribute( 'figmol_node' ) ?? ''

			if( !ids.length || !over || ids.includes( over ) ) {
				if( shown ) this.measures( null )
				return
			}

			const box = $bog_figmol_magnet.bbox( ids.map( id => this.node_rect( id ) ) )
			const gaps = $bog_figmol_magnet.gaps( box, [ this.node_rect( over ) ], true )

			this.measures( gaps.length ? gaps : null )
		}

		/**
		 * Copies for an Alt drag: the originals stay put and the copies are what
		 * the pointer takes away.
		 *
		 * A duplicate is normally written a step aside so a plain ⌘D lands
		 * somewhere visible. Here that step would be a jump, so the copies are
		 * drafted onto the rectangles of their originals — and the drag writes
		 * where they really end up anyway.
		 */
		@ $mol_action
		clone( ids: readonly string[] ): readonly string[] {

			const store = this.store()

			const pairs = [] as string[][]
			store.group( ()=> {
				for( const id of ids ) {
					const made = store.node_copy( id )
					if( made ) pairs.push([ id, made ])
				}
			} )

			if( !pairs.length ) return ids

			const rects = {} as Record< string, readonly number[] >
			for( const [ from, made ] of pairs ) rects[ made ] = store.rect( from )

			this.draft( rects )

			const made = pairs.map( pair => pair[ 1 ] )
			this.selection( made )

			return made
		}

		@ $mol_action
		pointer_move( event?: PointerEvent ) {

			if( !event ) return null

			if( !this.mode ) {
				this.measure_hover( event )
				return null
			}

			this.last_x = event.clientX
			this.last_y = event.clientY

			const shift_x = event.clientX - this.grab_x
			const shift_y = event.clientY - this.grab_y

			if( this.mode === 'pan' ) {
				this.pan_x( this.grab_pan[ 0 ] + shift_x )
				this.pan_y( this.grab_pan[ 1 ] + shift_y )
				return null
			}

			if( this.mode === 'marquee' ) {
				const band = this.marquee() ?? [ 0, 0, 0, 0 ]
				const point = this.sheet_point( event )
				this.marquee([ band[ 0 ], band[ 1 ], point[ 0 ], point[ 1 ] ])
				return null
			}

			const zoom = this.zoom()
			const move_x = shift_x / zoom
			const move_y = shift_y / zoom

			if( this.mode === 'move' ) {

				// One element looks for a frame to fall into. A group keeps to the
				// sheet: several nodes, each with a parent of its own, would need a
				// rule for what "into this frame" means for the lot of them.
				this.drop_target(
					this.grab_ids.length === 1 ? this.frame_at( event, this.grab_id ) : ''
				)

				const [ snap_x, snap_y ] = this.snap_move( move_x, move_y )

				this.grab_shift = [ snap_x, snap_y ]

				const rects = {} as Record< string, readonly number[] >

				for( const id of this.grab_ids ) {

					// A node inside an auto layout has nowhere to go on its own: the
					// frame decides where it sits, and the drag only picks the order.
					if( this.grab_flows[ id ] ) continue

					const [ x, y, w, h ] = this.grab_rects[ id ] ?? [ 0, 0, 0, 0 ]
					rects[ id ] = [ Math.round( x + snap_x ), Math.round( y + snap_y ), w, h ]

				}

				this.draft( Object.keys( rects ).length ? rects : null )

				if( this.grab_ids.length > 1 ) {
					const box = this.grab_box
					this.drag_box([ box[ 0 ] + snap_x, box[ 1 ] + snap_y, box[ 2 ], box[ 3 ] ])
				}

				return null
			}

			if( this.mode === 'scale' ) {
				this.scale_move( move_x, move_y )
				return null
			}

			const id = this.grab_id
			const [ x, y, w, h ] = this.grab_rects[ id ] ?? [ 0, 0, 0, 0 ]
			const corner = this.grab_corner
			let x2 = x, y2 = y, w2 = w, h2 = h

			if( corner.includes( 'e' ) ) w2 = Math.max( figmol_size_min, w + move_x )
			if( corner.includes( 's' ) ) h2 = Math.max( figmol_size_min, h + move_y )

			if( corner.includes( 'w' ) ) {
				w2 = Math.max( figmol_size_min, w - move_x )
				x2 = x + w - w2
			}

			if( corner.includes( 'n' ) ) {
				h2 = Math.max( figmol_size_min, h - move_y )
				y2 = y + h - h2
			}

			// Snapping speaks sheet coordinates, the rectangle is stored against
			// the frame around it, and the two differ by the corner of that frame.
			const origin = this.grab_origin

			const snapped = this.snap_edges(
				[ x2 + origin[ 0 ], y2 + origin[ 1 ], w2, h2 ],
				corner,
			)

			this.draft({
				[ id ]: [
					Math.round( snapped[ 0 ] - origin[ 0 ] ),
					Math.round( snapped[ 1 ] - origin[ 1 ] ),
					Math.round( snapped[ 2 ] ),
					Math.round( snapped[ 3 ] ),
				],
			})

			return null
		}

		/**
		 * A group being scaled by one of the grips of its frame.
		 *
		 * The frame is the thing the pointer drags; every element inside keeps its
		 * place and its size as a share of that frame, so the whole arrangement is
		 * stretched rather than each element being resized on its own. The corner
		 * opposite the grip stays where it is, as it does for a single element.
		 */
		@ $mol_action
		scale_move( move_x: number, move_y: number ) {

			const box = this.grab_box
			const corner = this.grab_corner

			const west = corner.includes( 'w' )
			const north = corner.includes( 'n' )

			const wide = Math.max( figmol_size_min, box[ 2 ] + ( west ? -move_x : move_x ) )
			const tall = Math.max( figmol_size_min, box[ 3 ] + ( north ? -move_y : move_y ) )

			const drawn = this.snap_edges(
				[
					west ? box[ 0 ] + box[ 2 ] - wide : box[ 0 ],
					north ? box[ 1 ] + box[ 3 ] - tall : box[ 1 ],
					wide,
					tall,
				],
				corner,
			)

			const scale_x = drawn[ 2 ] / ( box[ 2 ] || 1 )
			const scale_y = drawn[ 3 ] / ( box[ 3 ] || 1 )

			const rects = {} as Record< string, readonly number[] >

			for( const id of this.grab_ids ) {

				const place = this.grab_sheets[ id ] ?? [ 0, 0 ]
				const rect = this.grab_rects[ id ] ?? [ 0, 0, 0, 0 ]

				// Back from the sheet into the coordinates of whatever frame this
				// particular element lives in — a selection may span several.
				const origin = [ place[ 0 ] - rect[ 0 ], place[ 1 ] - rect[ 1 ] ]

				rects[ id ] = [
					Math.round( drawn[ 0 ] + ( place[ 0 ] - box[ 0 ] ) * scale_x - origin[ 0 ] ),
					Math.round( drawn[ 1 ] + ( place[ 1 ] - box[ 1 ] ) * scale_y - origin[ 1 ] ),
					Math.max( figmol_size_min, Math.round( rect[ 2 ] * scale_x ) ),
					Math.max( figmol_size_min, Math.round( rect[ 3 ] * scale_y ) ),
				]

			}

			this.draft( rects )
			this.drag_box( drawn )
		}

		/**
		 * Everything is written before any of the gesture state is cleared:
		 * handlers are retried when something inside throws a promise, and a
		 * retry that found the fields already reset would lose the drag.
		 */
		@ $mol_action
		pointer_up( event?: PointerEvent ) {

			// Where the gesture ended is normally the last move, but a pointer can
			// be released without ever having moved through a handler — a synthetic
			// drag, a lost capture — and the release itself carries the position.
			if( event && event.isPrimary ) {
				this.last_x = event.clientX
				this.last_y = event.clientY
			}

			const mode = this.mode
			const ids = this.grab_ids
			const draft = this.draft()

			if( mode === 'marquee' ) {
				this.marquee_settle()
			} else if( mode === 'move' && ids.length === 1 && this.grab_id ) {
				this.node_settle( this.grab_id )
			} else if( draft ) {
				const store = this.store()
				store.group( ()=> {
					for( const id of Object.keys( draft ) ) store.rect_set( id, draft[ id ] )
				} )
			}

			// A press on one member of a group is how the group gets dragged, so it
			// may not narrow the selection down. A press that turned out to be a
			// plain click may, and that is the only way back to a single element.
			if( mode === 'move' && this.grab_group && !this.moved() ) this.selection([ this.grab_pick ])

			this.mode = ''
			this.grab_id = ''
			this.grab_ids = []
			this.grab_group = false
			this.draft( null )
			this.drop_target( '' )
			this.marquee( null )
			this.guide_x( null )
			this.guide_y( null )
			this.measures( null )
			this.drag_box( null )

			return null
		}

		/** Adds whatever the rubber band caught to whatever it started with. */
		@ $mol_action
		marquee_settle() {

			const band = this.marquee()
			if( !band ) return

			const res = [ ... this.grab_base ]

			for( const id of this.marquee_hits( band ) ) {
				if( !res.includes( id ) ) res.push( id )
			}

			this.selection( res )
		}

		/**
		 * Commits a finished drag of a single element. The frame under the pointer
		 * decides where the node lands: another frame takes it in, the one it
		 * already sits in either reorders it — that is what a drag inside an auto
		 * layout means — or just moves it about.
		 *
		 * Coordinates are recomputed against the new frame, from where the shape
		 * actually was on screen rather than from its stored X and Y. Inside an
		 * auto layout those two disagree, and pulling an element out onto the
		 * sheet has to leave it where the pointer left it.
		 */
		@ $mol_action
		node_settle( id: string ) {

			const store = this.store()
			const root = store.root_id()
			const point = { clientX: this.last_x, clientY: this.last_y }

			const parent = store.parent( id ) || root
			const target = this.frame_at( point, id ) || root
			const index = this.drop_index( target, point, id )

			const draft = this.draft()

			if( target === parent && !store.auto_layout( target ) ) {
				if( draft ) for( const key of Object.keys( draft ) ) store.rect_set( key, draft[ key ] )
				return
			}

			// The move the drag actually drew, snapping included — not the raw
			// travel of the pointer. Dropping into another frame would otherwise
			// undo the sticking that was on screen a moment ago.
			const grab = this.grab_sheets[ id ] ?? [ 0, 0 ]
			const shift = this.grab_shift
			const sheet_x = grab[ 0 ] + shift[ 0 ]
			const sheet_y = grab[ 1 ] + shift[ 1 ]
			const origin = this.node_origin( target )

			store.node_reparent( id, target, index, sheet_x - origin[ 0 ], sheet_y - origin[ 1 ] )
		}

		/**
		 * Places what the armed tool says, inside the frame under the pointer.
		 *
		 * Everything that can suspend is read up front: reaching the site Land may
		 * still be pending, and the handler is retried once it resolves. Nothing is
		 * written before that point, so the retry cannot duplicate the node.
		 */
		@ $mol_action
		node_add( kind: string, event: PointerEvent ) {

			const store = this.store()
			const parent = this.frame_at( event, '' ) || store.root_id()
			if( !parent ) return

			const point = this.sheet_point( event )
			const origin = this.node_origin( parent )

			const text =
				kind === 'text' ? this.text_default()
				: kind === 'button' ? this.button_default()
				: ''

			const id = store.node_add( kind, parent, point[ 0 ] - origin[ 0 ], point[ 1 ] - origin[ 1 ], text )
			if( id ) this.selection([ id ])

		}

		/**
		 * Double click goes one level deeper, into the frame under the pointer —
		 * and opens the caption for typing when what it reaches is an element that
		 * has one and is already picked. That is two presses on a text: the first
		 * one selects it inside its frame, the second one starts the typing.
		 *
		 * What was double clicked cannot simply be read off the event. The press
		 * that came first captured the pointer on the canvas, and the browser
		 * retargets the click events that follow onto whatever holds the capture —
		 * so `event.target` is the canvas itself. The press remembered what was
		 * under it, which is the answer being looked for here; the hit test stays
		 * as the first guess for the cases where nothing was captured.
		 */
		@ $mol_action
		pointer_edit( event?: MouseEvent ) {

			if( !event ) return null
			if( !this.editable() ) return null

			const store = this.store()
			const target = event.target as Element
			const shape = target.closest( '[figmol_node]' )
			const deep = shape?.getAttribute( 'figmol_node' ) || this.press_deep
			const picked = this.selection()
			const current = picked.length === 1 ? picked[ 0 ] : ''

			if(
				current
				&& figmol_captioned.includes( store.kind( current ) )
				&& ( !deep || store.inside( deep, current ) )
			) {
				event.preventDefault()
				this.editing( current )
				this.Shape( current ).Editor().bring()
				return null
			}

			if( !deep ) return null

			const host = this.scope_now() || store.root_id()
			const outer = this.child_of( host, deep )

			// Nothing deeper to go into: what is under the pointer is already a
			// child of the level being edited.
			if( !outer || outer === deep ) return null

			event.preventDefault()

			this.scope( outer )

			const inner = this.child_of( outer, deep )
			if( inner ) this.selection([ inner ])

			return null
		}

		/* ---------------------------------------------------------------- zoom */

		/** Scales about a point of the viewport, keeping what is under it in place. */
		@ $mol_action
		zoom_at( next: number, screen_x: number, screen_y: number ) {

			const zoom = this.zoom()
			const step = Math.min( figmol_zoom_max, Math.max( figmol_zoom_min, next ) )

			const world_x = ( screen_x - this.pan_x() ) / zoom
			const world_y = ( screen_y - this.pan_y() ) / zoom

			this.pan_x( screen_x - world_x * step )
			this.pan_y( screen_y - world_y * step )
			this.zoom( step )
		}

		@ $mol_action
		wheel_zoom( event?: WheelEvent ) {

			if( !event ) return null

			event.preventDefault()

			if( !event.ctrlKey && !event.metaKey ) {
				this.pan_x( this.pan_x() - event.deltaX )
				this.pan_y( this.pan_y() - event.deltaY )
				return null
			}

			const rect = ( this.dom_node() as HTMLElement ).getBoundingClientRect()

			this.zoom_at(
				this.zoom() * Math.exp( -event.deltaY / 400 ),
				event.clientX - rect.left,
				event.clientY - rect.top,
			)

			return null
		}

		/** One step of ⌘+ or ⌘-, about the middle of the window. */
		@ $mol_action
		zoom_step( dir: number ) {
			const view = this.viewport()
			const next = this.zoom() * ( dir > 0 ? figmol_zoom_step : 1 / figmol_zoom_step )
			this.zoom_at( next, view.width / 2, view.height / 2 )
		}

		/** Back to life size, ⌘0, without losing the spot being looked at. */
		@ $mol_action
		zoom_reset() {
			const view = this.viewport()
			this.zoom_at( 1, view.width / 2, view.height / 2 )
		}

		/**
		 * Fits everything on the page into the window, ⇧1.
		 *
		 * The box is measured off the screen rather than taken from the stored
		 * coordinates: inside an auto layout those say nothing, and the point of
		 * this is to show what is actually drawn.
		 */
		@ $mol_action
		zoom_fit() {

			const view = this.viewport()
			const box = this.content_box()

			if( !box[ 2 ] || !box[ 3 ] ) return

			const zoom = Math.min(
				figmol_zoom_max,
				Math.max(
					figmol_zoom_min,
					Math.min(
						( view.width - figmol_fit_gap * 2 ) / box[ 2 ],
						( view.height - figmol_fit_gap * 2 ) / box[ 3 ],
					),
				),
			)

			this.zoom( zoom )
			this.pan_x( ( view.width - box[ 2 ] * zoom ) / 2 - box[ 0 ] * zoom )
			this.pan_y( ( view.height - box[ 3 ] * zoom ) / 2 - box[ 1 ] * zoom )
		}

		/** What is drawn on the page, as one rectangle in sheet pixels. */
		content_box(): readonly number[] {

			const store = this.store()
			const sheet = this.Sheet().dom_node().getBoundingClientRect()
			const zoom = this.zoom_live()

			let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity

			for( const id of store.kids( store.root_id() ) ) {

				const node = this.shape_dom( id )
				if( !node ) continue

				const rect = node.getBoundingClientRect()

				left = Math.min( left, ( rect.left - sheet.left ) / zoom )
				top = Math.min( top, ( rect.top - sheet.top ) / zoom )
				right = Math.max( right, ( rect.right - sheet.left ) / zoom )
				bottom = Math.max( bottom, ( rect.bottom - sheet.top ) / zoom )

			}

			// An empty page still has a sheet, and fitting that is a fair answer.
			if( !( right > left ) || !( bottom > top ) ) {
				return [ 0, 0, this.sheet_width(), this.sheet_height() ]
			}

			return [ left, top, right - left, bottom - top ]
		}

		/* ------------------------------------------------------------ keyboard */

		/**
		 * Space held down turns the next drag into a pan, the way it does in every
		 * editor with a canvas. The listener is on the window: the canvas only
		 * hears the keys when it holds the focus, and reaching for space before
		 * reaching for the mouse is the whole point of the gesture.
		 */
		@ $mol_mem
		listen() {

			const win = this.$.$mol_dom_context

			win.addEventListener( 'keydown', ( event: KeyboardEvent )=> this.space_key( event, true ) )
			win.addEventListener( 'keyup', ( event: KeyboardEvent )=> this.space_key( event, false ) )

			// Leaving the window with space down would otherwise come back to a
			// canvas that pans and never stops.
			win.addEventListener( 'blur', ()=> {
				if( this.space() ) $mol_wire_async( this ).space( false )
			} )

			// A press anywhere but on the menu closes it, including a press into
			// the panels beside the canvas — which the canvas never hears about.
			win.addEventListener( 'pointerdown', ( event: PointerEvent )=> {
				const node = event.target as Element | null
				if( node?.closest?.( '[figmol_menu]' ) ) return
				if( !this.menu() ) return
				$mol_wire_async( this ).menu( null )
			} )

			return null
		}

		@ $mol_mem
		space( next?: boolean ) {
			return next ?? false
		}

		space_key( event: KeyboardEvent, down: boolean ) {

			if( event.code !== 'Space' ) return

			const node = event.target as Element | null
			if( node?.closest?.( figmol_fields ) ) return

			if( down === this.space() ) return

			// Space scrolls the page otherwise, and the canvas is what it would
			// scroll away from.
			if( down ) event.preventDefault()

			$mol_wire_async( this ).space( down )
		}

		/* ------------------------------------------------------------ menu */

		/** Where the menu stands, in screen pixels of the canvas. Closed is `null`. */
		@ $mol_mem
		menu( next?: readonly number[] | null ) {
			return next ?? null
		}

		menu_on() {
			return !!this.menu()
		}

		menu_left() {
			return ( this.menu()?.[ 0 ] ?? 0 ) + 'px'
		}

		menu_top() {
			return ( this.menu()?.[ 1 ] ?? 0 ) + 'px'
		}

		/**
		 * The right button opens the menu over whatever it was pressed on, picking
		 * that element first when it was not picked already — the same rule every
		 * editor follows, and the reason the menu can talk about "the selection"
		 * without ever meaning something the user cannot see.
		 *
		 * A press on empty space has nothing to offer, so it only clears the menu.
		 */
		@ $mol_action
		context_menu( event?: MouseEvent ) {

			if( !event ) return null

			event.preventDefault()

			if( !this.editable() ) return null

			const target = event.target as Element
			const shape = target.closest( '[figmol_node]' )
			const deep = shape?.getAttribute( 'figmol_node' ) || this.press_deep
			const id = this.pick( deep, event )

			if( id && !this.selection().includes( id ) ) this.selection([ id ])

			if( !id || !this.selection().length ) {
				this.menu( null )
				return null
			}

			const view = this.viewport()

			this.menu([
				Math.max( 0, Math.min( event.clientX - view.left, view.width - figmol_menu[ 0 ] ) ),
				Math.max( 0, Math.min( event.clientY - view.top, view.height - figmol_menu[ 1 ] ) ),
			])

			return null
		}

		@ $mol_action
		menu_copy( next?: any ) {

			if( next === undefined ) return null

			this.menu( null )

			const store = this.store()
			const made = [] as string[]

			store.group( ()=> {
				for( const id of this.selection() ) {
					const copy = store.node_copy( id )
					if( copy ) made.push( copy )
				}
			} )

			if( made.length ) this.selection( made )

			return null
		}

		@ $mol_action
		menu_front( next?: any ) {
			if( next === undefined ) return null
			this.lift( true )
			return null
		}

		@ $mol_action
		menu_back( next?: any ) {
			if( next === undefined ) return null
			this.lift( false )
			return null
		}

		@ $mol_action
		menu_drop( next?: any ) {
			if( next === undefined ) return null
			this.menu( null )
			this.drop( true )
			return null
		}

		/**
		 * Moves everything picked to the top or to the bottom of the pile inside
		 * its own frame, keeping the order the elements had among themselves: they
		 * are lifted starting from the one that was lowest, so the one that was on
		 * top ends up on top.
		 */
		@ $mol_action
		lift( top: boolean ) {

			this.menu( null )

			const store = this.store()
			const order = store.node_ids()

			const ids = [ ... this.selection() ]
				.sort( ( left, right )=> order.indexOf( left ) - order.indexOf( right ) )

			if( !top ) ids.reverse()

			store.group( ()=> {
				for( const id of ids ) store.node_lift( id, top )
			} )
		}

		/**
		 * Puts a frame around everything picked and moves it inside, keeping every
		 * element exactly where it was on the page.
		 *
		 * The frame places its children freely rather than by an auto layout. A
		 * layout would be the more useful frame to end up with, and it would also
		 * reflow a hand-made arrangement the moment it appeared — which is not
		 * what "wrap this" means to anybody watching it happen. Turning the layout
		 * on afterwards is one click in the inspector.
		 *
		 * Only elements sharing one frame can be wrapped: the box is measured in
		 * the coordinates of that frame, and elements placed by an auto layout
		 * have no coordinates of their own to move.
		 */
		@ $mol_action
		menu_wrap( next?: any ) {

			if( next === undefined ) return null

			this.menu( null )

			const store = this.store()
			const ids = this.selection().filter( id => !store.flow( id ) )
			if( !ids.length ) return null

			const host = store.parent( ids[ 0 ] )
			if( !host ) return null
			if( ids.some( id => store.parent( id ) !== host ) ) return null

			const box = $bog_figmol_magnet.bbox( ids.map( id => store.rect( id ) ) )

			let made = ''

			store.group( ()=> {

				made = store.node_add( 'frame', host, box[ 0 ], box[ 1 ], '' )
				if( !made ) return

				store.rect_set( made, box )

				// A fresh frame comes out of the palette laying its children out in
				// a column. That is the right default for an empty one and the
				// wrong one here, where the children are already placed.
				store.direction( made, '' )

				ids.forEach( ( id, at )=> {
					store.node_reparent( id, made, at, store.x( id ) - box[ 0 ], store.y( id ) - box[ 1 ] )
				} )

			} )

			if( made ) this.selection([ made ])

			return null
		}

		@ $mol_action
		deselect( next?: any ) {
			this.menu( null )
			this.editing( '' )
			this.scope( '' )
			this.selection([])
			return null
		}

		/** Delete removes everything selected — unless a caption is being typed. */
		@ $mol_action
		drop( next?: any ) {

			if( !this.editable() ) return null
			if( this.editing() ) return null

			const ids = this.selection()
			if( !ids.length ) return null

			const store = this.store()
			store.group( ()=> { for( const id of ids ) store.node_drop( id ) } )

			this.selection([])

			return null
		}

	}

}
