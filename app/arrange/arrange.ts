namespace $ {

	/** One box being arranged: left, top, width, height, all in sheet pixels. */
	export type $bog_figmol_app_arrange_box = readonly number[]

	/**
	 * Where a row of elements goes when it is lined up or spread out.
	 *
	 * Pure arithmetic over rectangles, with no idea what a node is: the panel
	 * measures the selection, this decides where every box should end up, and
	 * the store writes it. Which is what makes the awkward half — three boxes of
	 * different widths spread across the distance the outer two already span —
	 * something a test can pin down without a canvas.
	 *
	 * Boxes come in and go out in the same order. Every mode answers with a
	 * full list of new corners, including the ones that did not move: a caller
	 * that writes a coordinate it already had writes nothing.
	 */
	export class $bog_figmol_app_arrange {

		/** Modes the editor offers, in the order the buttons sit. */
		static readonly modes: readonly string[] = [
			'left', 'hcenter', 'right', 'hspace',
			'top', 'vcenter', 'bottom', 'vspace',
		]

		static place( mode: string, boxes: readonly $bog_figmol_app_arrange_box[] ): readonly $bog_figmol_app_arrange_box[] {

			if( boxes.length < 2 ) return boxes.map( box => [ box[ 0 ], box[ 1 ] ] )

			switch( mode ) {
				case 'left': return this.edge( boxes, 0, 'min' )
				case 'right': return this.edge( boxes, 0, 'max' )
				case 'hcenter': return this.edge( boxes, 0, 'mid' )
				case 'top': return this.edge( boxes, 1, 'min' )
				case 'bottom': return this.edge( boxes, 1, 'max' )
				case 'vcenter': return this.edge( boxes, 1, 'mid' )
				case 'hspace': return this.spread( boxes, 0 )
				case 'vspace': return this.spread( boxes, 1 )
			}

			return boxes.map( box => [ box[ 0 ], box[ 1 ] ] )
		}

		/**
		 * Lines every box up on one axis: to the near edge of the whole lot, to
		 * the far one, or through the middle between them.
		 *
		 * The axis is `0` for horizontal and `1` for vertical, which is also the
		 * offset of its coordinate and — plus two — of its size.
		 */
		static edge(
			boxes: readonly $bog_figmol_app_arrange_box[],
			axis: number,
			at: 'min' | 'mid' | 'max',
		): readonly $bog_figmol_app_arrange_box[] {

			const size = axis + 2

			const near = Math.min( ... boxes.map( box => box[ axis ] ) )
			const far = Math.max( ... boxes.map( box => box[ axis ] + box[ size ] ) )
			const mid = ( near + far ) / 2

			return boxes.map( box => {

				const spot =
					at === 'min' ? near
					: at === 'max' ? far - box[ size ]
					: mid - box[ size ] / 2

				const res = [ box[ 0 ], box[ 1 ] ]
				res[ axis ] = Math.round( spot )

				return res
			} )
		}

		/**
		 * Spreads the boxes so the gaps between them come out equal, keeping the
		 * two outermost where they are — the span was chosen by dragging those
		 * two, and moving them would answer a question nobody asked.
		 *
		 * Fewer than three boxes have no gap to even out, and boxes that overlap
		 * are spread just the same, with a negative gap: they were told to sit at
		 * equal distances, and equal is what they get.
		 */
		static spread(
			boxes: readonly $bog_figmol_app_arrange_box[],
			axis: number,
		): readonly $bog_figmol_app_arrange_box[] {

			const size = axis + 2
			if( boxes.length < 3 ) return boxes.map( box => [ box[ 0 ], box[ 1 ] ] )

			const order = boxes.map( ( box, at )=> at ).sort(
				( a, b )=> ( boxes[ a ][ axis ] - boxes[ b ][ axis ] ) || ( a - b )
			)

			const near = boxes[ order[ 0 ] ][ axis ]
			const last = boxes[ order[ order.length - 1 ] ]
			const far = last[ axis ] + last[ size ]

			const span = boxes.reduce( ( sum, box )=> sum + box[ size ], 0 )
			const gap = ( far - near - span ) / ( boxes.length - 1 )

			const res = boxes.map( box => [ box[ 0 ], box[ 1 ] ] )
			let cursor = near

			for( const at of order ) {
				res[ at ][ axis ] = Math.round( cursor )
				cursor += boxes[ at ][ size ] + gap
			}

			return res
		}

	}

}
