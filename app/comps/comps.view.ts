namespace $.$$ {

	/** Distance an instance is dropped from whatever already sits on the spot. */
	const figmol_comps_step = 40

	/** How close two elements have to be before the second one steps aside. */
	const figmol_comps_near = 12

	const figmol_comps_tries = 20

	/**
	 * The components of the site, in the left rail next to the blocks.
	 *
	 * A row does two things, which is why it is two buttons: the wide one drops
	 * an instance in the middle of the viewport, the narrow one opens the master
	 * for editing. Opening it points the whole editor at another root — the
	 * canvas, the layer tree and the inspector go on working on it without
	 * knowing they are inside a component — and the panel grows a way back.
	 *
	 * A component may not be dropped into itself, directly or through another
	 * one: those rows are disabled rather than silently refusing, because a row
	 * that does nothing when clicked reads as a broken panel.
	 */
	export class $bog_figmol_app_comps extends $.$bog_figmol_app_comps {

		editing() {
			return !!this.store().comp_current()
		}

		@ $mol_mem
		override panels(): readonly $mol_view[] {

			const res = [ this.Head() ] as $mol_view[]

			res.push( this.store().comp_ids().length ? this.List() : this.Empty() )

			if( this.editing() ) res.push( this.Editing(), this.Field_title(), this.Drop() )

			return res
		}

		@ $mol_mem
		rows(): readonly $mol_view[] {
			return this.store().comp_ids().map( id => this.Row( id ) )
		}

		row_content( id: string ): readonly $mol_view[] {
			return [ this.Pick( id ), this.Edit( id ) ]
		}

		/** A component with no name yet is still worth a line in the list. */
		row_title( id: string ) {
			return this.store().comp_title( id ) || $bog_figmol_blocks.title( 'inst' )
		}

		@ $mol_mem_key
		row_active( id: string ) {
			return this.store().comp_current() === id
		}

		@ $mol_mem_key
		row_enabled( id: string ) {
			return !this.store().comp_cyclic( id )
		}

		/**
		 * Where an instance lands: the middle of what the user is looking at, then
		 * stepped aside while something already starts there — the same rule the
		 * block palette follows, and for the same reason.
		 */
		place( id: string ): readonly number[] {

			const store = this.store()
			const rect = store.rect( store.comp_root( id ) )
			const spot = this.spot()

			let x = Math.max( 0, Math.round( ( spot[ 0 ] ?? 0 ) - ( rect[ 2 ] ?? 160 ) / 2 ) )
			let y = Math.max( 0, Math.round( ( spot[ 1 ] ?? 0 ) - ( rect[ 3 ] ?? 48 ) / 2 ) )

			for( let guard = 0; guard < figmol_comps_tries && this.taken( x, y ); ++guard ) {
				x += figmol_comps_step
				y += figmol_comps_step
			}

			return [ x, y ]
		}

		taken( x: number, y: number ) {

			const store = this.store()

			return store.kids( store.root_id() ).some( id => {
				const rect = store.rect( id )
				return Math.abs( rect[ 0 ] - x ) < figmol_comps_near
					&& Math.abs( rect[ 1 ] - y ) < figmol_comps_near
			} )
		}

		@ $mol_action
		row_click( id: string, next?: any ) {

			if( next === undefined ) return null

			const store = this.store()
			const at = this.place( id )

			const made = store.inst_add( id, store.root_id(), at[ 0 ], at[ 1 ] )
			if( made ) this.selected( made )

			return null
		}

		/**
		 * Opens the master. The selection is dropped along the way: it names a
		 * node of the page just left, and the inspector would go on offering to
		 * change something nobody can see any more.
		 */
		@ $mol_action
		row_edit( id: string, next?: any ) {
			if( next === undefined ) return null
			this.store().comp_id( id )
			this.selected( '' )
			return null
		}

		@ $mol_action
		comp_leave( next?: any ) {
			if( next === undefined ) return null
			this.store().comp_id( null )
			this.selected( '' )
			return null
		}

		current_title( next?: string ) {
			return this.store().comp_title( this.store().comp_current(), next )
		}

		@ $mol_action
		comp_drop( next?: any ) {

			if( next === undefined ) return null

			const store = this.store()
			const id = store.comp_current()
			if( !id ) return null

			store.comp_drop( id )
			store.comp_id( null )
			this.selected( '' )

			return null
		}

	}

}
