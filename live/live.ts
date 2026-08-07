namespace $ {

	/**
	 * Anybody holding the link writes, and no Proof of Work on the way in: a
	 * cursor goes out many times a second, and a proof per move would cost more
	 * than the whole editor.
	 */
	const preset_live: $giper_baza_rank_preset = [[ null, $giper_baza_rank_post( 'just' ) ]]

	/** How often this browser is allowed to say where its cursor is. */
	const live_flush = 60

	/** How often it says so anyway, having nothing new to report. */
	const live_beat = 2000

	/**
	 * Silence after which somebody is taken to have left.
	 *
	 * Generous, and it has to be: a browser throttles the timers of a tab nobody
	 * is looking at, and the beat of a window left open on another screen arrives
	 * every ten seconds or so rather than every two. Somebody who has closed the
	 * tab lingers for this long, which is a fair price for not blinking out
	 * everybody who looked away.
	 */
	const live_gone = 20000

	/**
	 * Silence after which a cursor stops being drawn, the person staying in the
	 * list all the same.
	 *
	 * A pointer is a place somebody is looking at right now, and one that has not
	 * moved for a while is a claim the window can no longer support. Presence is
	 * a fact and outlives it.
	 */
	const live_idle = 6000

	/** How often presence is judged again. */
	const live_step = 1000

	/**
	 * How far the clock of a writer may be from ours and still be believed.
	 *
	 * Only ever used to throw away what is plainly old — a pawn left in the room
	 * by somebody who was here yesterday. Without it a cold load would show
	 * every visitor the site ever had, until each of them went quiet in turn.
	 */
	const live_stale = 300_000

	/** Fields of a packed spot, in order: place, x, y, wall clock. */
	const live_split = '|'

	/** Where the name of this browser is kept. */
	const live_name = 'bog_figmol_live_name'

	/**
	 * Where somebody is, unpacked.
	 *
	 * Deliberately not named after the module it lives in: to the builder an
	 * identifier of that shape is a path, and it would go looking for a module
	 * under `live/` that does not exist.
	 */
	type Spot = {

		/** Page, or component master, they are looking at. */
		readonly place: string

		/** Cursor in sheet pixels, `null` when it is not over the sheet. */
		readonly x: number | null
		readonly y: number | null

		/** Their own clock at the moment they wrote this. */
		readonly wall: number

	}

	/**
	 * Who else is looking at this site, and where their cursor is.
	 *
	 * Everything travels through a Land of its own, grabbed by the owner and
	 * writable by anybody holding the link. The site itself stays readable and
	 * nothing more for a visitor — which is the point: presence is not allowed
	 * anywhere near the document, whose ordered lists do not survive two writers
	 * (see the note on co-editing in the README).
	 *
	 * Inside that Land nobody writes anybody else's pawn either. A participant
	 * owns the key named after their lord and the three registers under it, so
	 * the only shared write in the whole channel is putting that key in, once
	 * per person — a plain CRDT insert with a fresh self, which merges.
	 *
	 * Nothing that returns a Baza object is memoized: `@$mol_mem` makes the atom
	 * the owner of what it returns, and destructing a Land walks into a circular
	 * subscription.
	 */
	export class $bog_figmol_live extends $mol_object2 {

		// === Wiring ==============================================================

		/**
		 * The document this presence is about. Handed in by the app, which owns
		 * the one instance of both.
		 */
		store(): $bog_figmol_store {
			return $mol_fail( new Error( `${ this } has no store` ) )
		}

		/**
		 * What this browser has picked. Bound to the selection of the editor, so
		 * the channel reads it rather than being told — the selection changes from
		 * the canvas, the layer tree, the palette and the undo journal alike.
		 */
		picked(): readonly string[] {
			return []
		}

		/** Who this browser is, in the eyes of the Baza. */
		lord() {
			return this.$.$giper_baza_auth.current().pass().lord().str
		}

		/**
		 * What this browser calls itself.
		 *
		 * Kept beside the browser rather than in the document: the same person in
		 * two tabs is two participants with two cursors, and naming them is a
		 * property of the window they are in.
		 */
		name( next?: string ) {
			if( next !== undefined ) this.dirty = true
			return this.$.$mol_state_local.value< string >( live_name, next ) ?? ''
		}

		/** What the canvas is showing: a component master takes over from a page. */
		place() {
			const store = this.store()
			return store.comp_current() || store.page_current()
		}

		// === Room ================================================================

		/** Where everybody says where they are, `null` until there is one. */
		room() {
			return this.store().site()?.Live()?.remote() ?? null
		}

		/** Somebody's pawn in the room, `null` when they have never been here. */
		mate( lord: string ) {
			const room = this.room()
			if( !room || !lord ) return null
			return ( room.key( lord ) ?? null ) as $bog_figmol_schema_mate | null
		}

		/** This browser's own pawn, put in the room the first time it is asked for. */
		mine() {
			const room = this.room()
			if( !room ) return null
			return ( room.key( this.lord(), null ) ?? null ) as $bog_figmol_schema_mate | null
		}

		/**
		 * Makes the room, and does nothing at all for a visitor: the link to it
		 * lives in the site, and a visitor may not write there.
		 *
		 * Must run in a fiber of its own — grabbing a Land runs Proof of Work,
		 * whose task belongs to the fiber that asked for it. A render would begin
		 * the proof afresh on every retry and never finish one.
		 */
		@ $mol_action
		room_make() {

			const store = this.store()

			const site = store.site()
			if( !site ) return null

			const made = site.Live()?.remote()
			if( made ) return made

			if( !store.writable() ) return null

			const room = site.Live( null )!.ensure( preset_live )

			// Rights travel as a Gift, and a Gift nobody has signed yet is refused
			// by whoever receives it — leaving every visitor with the rank a Land
			// hands out by default, which is reading. Signing is lazy, so it is
			// asked for here, while the fiber that grabbed the Land is still alive.
			if( room ) room.land().units_saving()

			return room
		}

		// === Reading =============================================================

		/** Everybody who has ever been in the room, this browser included. */
		@ $mol_mem
		lords(): readonly string[] {
			const room = this.room()
			if( !room ) return []
			return room.keys().map( key => String( key ) )
		}

		/**
		 * Everybody but this browser who has said something lately.
		 *
		 * A room that has not arrived yet is nobody rather than a broken header:
		 * the atom subscribed to the reads it made before suspending, and comes
		 * back on its own once they resolve.
		 */
		@ $mol_mem
		mates(): readonly string[] {

			try {

				const me = this.lord()
				return this.lords().filter( lord => lord !== me && this.here( lord ) )

			} catch( error ) {
				if( !$mol_promise_like( error ) ) $mol_fail_log( error )
				return []
			}

		}

		/**
		 * Everybody whose cursor belongs on what the canvas is drawing now: same
		 * page or same component master, and heard from recently enough for the
		 * position to still mean something.
		 */
		@ $mol_mem_key
		crowd( place: string ): readonly string[] {
			if( !place ) return []
			return this.mates().filter( lord => this.spot( lord ).place === place && this.awake( lord ) )
		}

		/** Whether somebody has moved lately enough to be drawn where they were. */
		@ $mol_mem_key
		awake( lord: string ) {
			const now = this.$.$mol_state_time.now( live_step )
			return now - this.seen( lord ) < live_idle
		}

		/** Whether somebody is still around. */
		@ $mol_mem_key
		here( lord: string ) {

			const spot = this.spot( lord )
			if( !spot.wall ) return false

			const now = this.$.$mol_state_time.now( live_step )

			if( Math.abs( now - spot.wall ) > live_stale ) return false

			return now - this.seen( lord ) < live_gone
		}

		/**
		 * When this browser last saw that person say anything, by this browser's
		 * own clock.
		 *
		 * The cell is recomputed exactly when their registers change and never
		 * otherwise, so the answer needs no bookkeeping — and no agreement between
		 * two clocks, which two machines do not have.
		 */
		@ $mol_mem_key
		seen( lord: string ) {
			this.spot( lord )
			this.pick( lord )
			return Date.now()
		}

		/** Where somebody is, as they last said. */
		@ $mol_mem_key
		spot( lord: string ): Spot {
			return $bog_figmol_live.spot_read( this.mate( lord )?.Spot()?.val() ?? '' )
		}

		/** What somebody has picked. */
		@ $mol_mem_key
		pick( lord: string ): readonly string[] {
			return $bog_figmol_live.pick_read( this.mate( lord )?.Pick()?.val() ?? '' )
		}

		/** What to call somebody: their own name, or the short of their lord. */
		@ $mol_mem_key
		title( lord: string ) {
			const name = ( this.mate( lord )?.Name()?.val() ?? '' ).trim()
			return name || $bog_figmol_live.label( lord )
		}

		/** The colour that is theirs in every browser at once. */
		color( lord: string ) {
			return $bog_figmol_live.color( lord )
		}

		// === Writing =============================================================

		/**
		 * Where the pointer is, in sheet pixels, and whether it is over the sheet
		 * at all.
		 *
		 * Plain fields: a cursor moving repaints nothing here, and a cell written
		 * by one event handler and read by another is reset between the two — the
		 * fiber of the previous event is its only subscriber, and the next event
		 * kills it.
		 */
		spot_x = null as number | null
		spot_y = null as number | null

		/** What went out last, so an unchanged cursor costs one comparison. */
		sent_body = ''
		sent_pick = ''
		sent_time = 0

		/** Whether something that is not the cursor has changed. */
		dirty = false

		/** Whether a write has ever reached the room. */
		ready = false

		/** Whether the beat is running, and what to stop. */
		timer = null as null | ReturnType< typeof setInterval >

		/** Where the pointer is now. `null` twice means it has left the sheet. */
		point( x: number | null, y: number | null ) {
			this.spot_x = x
			this.spot_y = y
		}

		/**
		 * Starts the beat, once.
		 *
		 * Called from the render of the app, which is why the guard is a plain
		 * field and not an atom: a render re-runs, and a cell reset along with it
		 * would leave a second timer running beside the first.
		 */
		start() {

			if( this.timer ) return
			this.timer = setInterval( ()=> this.tick(), live_flush )

			// Looking away takes the pointer with it. A hidden tab has its timers
			// throttled to a crawl and could not say so a moment later, so it says
			// so while it still can.
			const doc = this.$.$mol_dom_context.document
			doc?.addEventListener( 'visibilitychange', ()=> {
				if( doc.hidden ) this.point( null, null )
			} )
		}

		destructor() {
			if( this.timer ) clearInterval( this.timer )
			this.timer = null
			super.destructor()
		}

		/**
		 * Decides whether anything is worth writing — many times a second, and
		 * without touching the Baza when it is not.
		 *
		 * Reading the editor from here may suspend while the site loads. That is
		 * not an error and not worth a line in the log: the next tick asks again.
		 */
		tick() {

			let place = ''
			let picked = [] as readonly string[]

			try {
				place = this.place()
				picked = this.picked()
			} catch( error ) {
				if( !$mol_promise_like( error ) ) $mol_fail_log( error )
				return
			}

			const body = $bog_figmol_live.spot_pack( place, this.spot_x, this.spot_y, 0 )
			const pick = $bog_figmol_live.pick_pack( picked )
			const now = Date.now()

			const still = body === this.sent_body && pick === this.sent_pick && !this.dirty
			const due = now - this.sent_time >= live_beat

			// Until a write has got through once, the room is still on its way, and
			// a fiber per cursor move would only pile up on the same Land — each of
			// them killed by the next tick and left waiting forever. A beat apart is
			// often enough to notice the room has arrived.
			if( !due && ( still || !this.ready ) ) return

			this.sent_body = body
			this.sent_pick = pick
			this.sent_time = now
			this.dirty = false

			// A fiber of its own, and a new one every time: the previous is killed
			// with it, so a write still waiting on the Land is dropped in favour of
			// where the cursor is now. Stale positions are of no interest to
			// anybody.
			$mol_wire_async( this ).flush().catch( ( error: unknown )=> {
				if( !$mol_promise_like( error ) ) $mol_fail_log( error )
			} )
		}

		/**
		 * Says where this browser is. Never decorated — `tick` hands it a fiber.
		 *
		 * Every register is written unconditionally: an atom whose value has not
		 * changed posts nothing, so the deduplication is already done a level
		 * below and doing it again here would only be a second place to get wrong.
		 */
		flush() {

			const mate = this.mine()
			if( !mate ) return

			mate.Spot( null )!.val(
				$bog_figmol_live.spot_pack( this.place(), this.spot_x, this.spot_y, Date.now() )
			)

			mate.Pick( null )!.val( $bog_figmol_live.pick_pack( this.picked() ) )
			mate.Name( null )!.val( this.name() )

			this.ready = true
		}

		// === Packing =============================================================

		/**
		 * Colours participants are given, in the order the palette hands them out.
		 * Picked to stay apart on a white sheet and on a dark one alike.
		 */
		static colors = [
			'#e5484d',
			'#f76b15',
			'#ffb224',
			'#30a46c',
			'#0091ff',
			'#8e4ec6',
			'#e93d82',
			'#12a594',
		] as readonly string[]

		/**
		 * Which colour of the palette a lord gets.
		 *
		 * A hash rather than a counter, so every browser works the answer out for
		 * itself and two of them never disagree about who is red.
		 */
		static slot( lord: string ) {
			let hash = 0
			for( let at = 0; at < lord.length; ++ at ) {
				hash = ( Math.imul( hash, 31 ) + lord.charCodeAt( at ) ) >>> 0
			}
			return hash % this.colors.length
		}

		static color( lord: string ) {
			return this.colors[ this.slot( lord ) ]
		}

		/** What to call somebody who has not said. */
		static label( lord: string ) {
			return lord.slice( 0, 4 ) || '?'
		}

		/** Packs where somebody is into the one register that carries it. */
		static spot_pack( place: string, x: number | null, y: number | null, wall: number ) {

			const off = x === null || y === null || !Number.isFinite( x ) || !Number.isFinite( y )

			return [
				place,
				off ? '' : String( Math.round( x! ) ),
				off ? '' : String( Math.round( y! ) ),
				String( wall ),
			].join( live_split )
		}

		static spot_read( raw: string ): Spot {

			const parts = raw.split( live_split )

			const x = Number( parts[ 1 ] )
			const y = Number( parts[ 2 ] )
			const wall = Number( parts[ 3 ] )

			return {
				place: parts[ 0 ] ?? '',
				x: parts[ 1 ] && Number.isFinite( x ) ? x : null,
				y: parts[ 2 ] && Number.isFinite( y ) ? y : null,
				wall: Number.isFinite( wall ) ? wall : 0,
			}
		}

		/** Links of the picked nodes. They never contain a space. */
		static pick_pack( ids: readonly string[] ) {
			return ids.join( ' ' )
		}

		static pick_read( raw: string ): readonly string[] {
			return raw ? raw.split( ' ' ).filter( Boolean ) : []
		}

	}

}
