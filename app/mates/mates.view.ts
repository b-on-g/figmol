namespace $.$$ {

	/**
	 * Who else is looking at this site: a coloured dot and a name each.
	 *
	 * Empty while nobody else is around, and the field for one's own name goes
	 * with it — a header of a lone editor has nothing to say about company, and
	 * a name nobody will read is not worth a control.
	 */
	export class $bog_figmol_app_mates extends $.$bog_figmol_app_mates {

		@ $mol_mem
		override chips(): readonly $mol_view[] {

			const mates = this.live().mates()
			if( !mates.length ) return []

			return [ this.Name(), ... mates.map( lord => this.Chip( lord ) ) ]
		}

		override name( next?: string ) {
			return this.live().name( next )
		}

		override chip_color( lord: string ) {
			return this.live().color( lord )
		}

		override chip_name( lord: string ) {
			return this.live().title( lord )
		}

	}

}
