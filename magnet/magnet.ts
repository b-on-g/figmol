namespace $ {

	/** A line a drag has landed on, and how far it had to move to get there. */
	export type $bog_figmol_magnet_hit = {
		readonly shift: number
		readonly line: number
	}

	/** A distance between two boxes: where the ruler starts, and how long it is. */
	export type $bog_figmol_magnet_gap = {
		readonly x: number
		readonly y: number
		readonly size: number
		/** Measured along x. A vertical ruler says `false`. */
		readonly row: boolean
	}

	/**
	 * Geometry of sticking one box to the others around it, and of the distances
	 * between them.
	 *
	 * Nothing here knows about the DOM, the store or the viewport. Boxes come in
	 * as `[ x, y, width, height ]` in one coordinate system — sheet pixels, as it
	 * happens — and every answer comes back in the same one. That is what makes
	 * the whole of the snapping testable without a browser: the canvas measures,
	 * this decides.
	 */
	export class $bog_figmol_magnet {

		/**
		 * The three places along one axis a box can stick by: its two edges and
		 * its middle.
		 *
		 * Edges come first on purpose. `snap` below keeps the first of two equally
		 * close answers, and sitting flush with a neighbour is the more likely
		 * intention than sharing a centre line with it by accident.
		 */
		static probes( min: number, size: number ): readonly number[] {
			return [ min, min + size, min + size / 2 ]
		}

		/** Edges and middles of every candidate, along one axis, as one flat list. */
		static lines( boxes: readonly ( readonly number[] )[], axis: number ): readonly number[] {

			const res = [] as number[]

			for( const box of boxes ) {
				const min = box[ axis ]
				const size = box[ axis + 2 ]
				res.push( min, min + size, min + size / 2 )
			}

			return res
		}

		/**
		 * Nearest line any of the probes can reach without moving further than
		 * `limit`, `null` when nothing is that close.
		 */
		static snap(
			probes: readonly number[],
			lines: readonly number[],
			limit: number,
		): $bog_figmol_magnet_hit | null {

			let res = null as $bog_figmol_magnet_hit | null
			let near = limit

			for( const probe of probes ) {
				for( const line of lines ) {

					const shift = line - probe
					const away = Math.abs( shift )

					if( away > near ) continue
					if( res && away >= near ) continue

					near = away
					res = { shift, line }

				}
			}

			return res
		}

		/** One box around the lot of them. */
		static bbox( boxes: readonly ( readonly number[] )[] ): readonly number[] {

			if( !boxes.length ) return [ 0, 0, 0, 0 ]

			let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity

			for( const box of boxes ) {
				left = Math.min( left, box[ 0 ] )
				top = Math.min( top, box[ 1 ] )
				right = Math.max( right, box[ 0 ] + box[ 2 ] )
				bottom = Math.max( bottom, box[ 1 ] + box[ 3 ] )
			}

			return [ left, top, right - left, bottom - top ]
		}

		/**
		 * Distance from `box` to the nearest neighbour on each of its four sides.
		 *
		 * A neighbour counts when it stands across from the box — the two overlap
		 * along the other axis — because that is the gap somebody laying out a
		 * page means by "how far apart are these". `loose` drops that condition,
		 * for the times when the question was asked about one particular element
		 * instead of about the whole neighbourhood.
		 */
		static gaps(
			box: readonly number[],
			boxes: readonly ( readonly number[] )[],
			loose: boolean,
		): readonly $bog_figmol_magnet_gap[] {
			return [
				... this.gaps_axis( box, boxes, 0, loose ),
				... this.gaps_axis( box, boxes, 1, loose ),
			]
		}

		/** The nearest neighbour before the box and the nearest one after it. */
		static gaps_axis(
			box: readonly number[],
			boxes: readonly ( readonly number[] )[],
			axis: number,
			loose: boolean,
		): readonly $bog_figmol_magnet_gap[] {

			const cross = 1 - axis

			let before = null as readonly number[] | null
			let after = null as readonly number[] | null
			let before_gap = Infinity
			let after_gap = Infinity

			for( const near of boxes ) {

				const overlap =
					Math.min( box[ cross ] + box[ cross + 2 ], near[ cross ] + near[ cross + 2 ] )
					- Math.max( box[ cross ], near[ cross ] )

				if( overlap <= 0 && !loose ) continue

				const ahead = near[ axis ] - box[ axis ] - box[ axis + 2 ]
				const behind = box[ axis ] - near[ axis ] - near[ axis + 2 ]

				if( ahead > 0 && ahead < after_gap ) {
					after_gap = ahead
					after = near
				}

				if( behind > 0 && behind < before_gap ) {
					before_gap = behind
					before = near
				}

			}

			const res = [] as $bog_figmol_magnet_gap[]

			if( before ) res.push( this.ruler( box, before, axis, before_gap ) )
			if( after ) res.push( this.ruler( box, after, axis, after_gap ) )

			return res
		}

		/**
		 * Where the ruler between a box and one of its neighbours is drawn: along
		 * the middle of what the two have in common, and through the middle of the
		 * box itself when they have nothing in common at all.
		 */
		static ruler(
			box: readonly number[],
			near: readonly number[],
			axis: number,
			size: number,
		): $bog_figmol_magnet_gap {

			const cross = 1 - axis
			const ahead = near[ axis ] > box[ axis ]

			const from = ahead
				? box[ axis ] + box[ axis + 2 ]
				: near[ axis ] + near[ axis + 2 ]

			const top = Math.max( box[ cross ], near[ cross ] )
			const bottom = Math.min( box[ cross ] + box[ cross + 2 ], near[ cross ] + near[ cross + 2 ] )
			const at = bottom > top ? ( top + bottom ) / 2 : box[ cross ] + box[ cross + 2 ] / 2

			return {
				x: axis === 0 ? from : at,
				y: axis === 0 ? at : from,
				size,
				row: axis === 0,
			}
		}

	}

}
