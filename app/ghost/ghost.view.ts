namespace $.$$ {

	/**
	 * What an instance of a component shows: the master subtree, drawn by the
	 * very shapes the canvas draws everything else with.
	 *
	 * Reusing the shape is the point — a component that looked different from
	 * the elements it is made of would be a second renderer to keep in step. The
	 * shapes here are made by this view rather than by the canvas, so two
	 * instances of one component are two sets of views over the same nodes,
	 * instead of one view that would have to be in two places at once.
	 *
	 * Nothing in here takes a press: the styles switch pointer events off, so a
	 * click anywhere over an instance walks up to the instance itself. That is
	 * also what keeps the master out of the selection — its nodes are not on
	 * the page, and picking one would be picking something that is not there.
	 */
	export class $bog_figmol_app_ghost extends $.$bog_figmol_app_ghost {

		@ $mol_mem
		shapes(): readonly $mol_view[] {
			const id = this.id()
			return id ? [ this.Shape( id ) ] : []
		}

		shape_id( id: string ) {
			return id
		}

		/**
		 * The master frame is stretched into the box of the instance, the way a
		 * resized instance behaves everywhere else. Everything below it keeps the
		 * geometry the master was drawn with.
		 */
		@ $mol_mem_key
		shape_rect( id: string ): readonly number[] {

			if( id !== this.id() ) return this.store().rect( id )

			const box = this.rect()
			return [ 0, 0, box[ 2 ] ?? 0, box[ 3 ] ?? 0 ]
		}

		@ $mol_mem_key
		shape_kids( id: string ): readonly $mol_view[] {
			return this.store().kids( id ).map( kid => this.Shape( kid ) )
		}

	}

}
