namespace $ {

	$mol_test({

		'a box offers its edges and its middle to stick by'() {
			$mol_assert_like( $bog_figmol_magnet.probes( 100, 40 ), [ 100, 140, 120 ] )
		},

		'every candidate contributes both edges and a middle'() {
			$mol_assert_like(
				$bog_figmol_magnet.lines( [ [ 10, 200, 40, 80 ] ], 0 ),
				[ 10, 50, 30 ],
			)
			$mol_assert_like(
				$bog_figmol_magnet.lines( [ [ 10, 200, 40, 80 ] ], 1 ),
				[ 200, 280, 240 ],
			)
		},

		'a near miss sticks and says how far it had to move'() {

			const hit = $bog_figmol_magnet.snap( [ 104 ], [ 100, 300 ], 6 )

			$mol_assert_equal( hit?.shift, -4 )
			$mol_assert_equal( hit?.line, 100 )

		},

		'nothing within reach sticks to nothing'() {
			$mol_assert_equal( $bog_figmol_magnet.snap( [ 120 ], [ 100, 300 ], 6 ), null )
		},

		/** The whole point of a threshold is that it is measured, not eyeballed. */
		'exactly at the threshold still sticks'() {
			$mol_assert_equal( $bog_figmol_magnet.snap( [ 106 ], [ 100 ], 6 )?.line, 100 )
			$mol_assert_equal( $bog_figmol_magnet.snap( [ 107 ], [ 100 ], 6 ), null )
		},

		'the nearest of several lines wins'() {

			const hit = $bog_figmol_magnet.snap( [ 100 ], [ 96, 103, 105 ], 6 )

			$mol_assert_equal( hit?.line, 103 )
			$mol_assert_equal( hit?.shift, 3 )

		},

		/**
		 * Probes are tried edge first, so a neighbour flush against the box beats
		 * a centre line exactly as close.
		 */
		'an edge wins a tie against a middle'() {

			const probes = $bog_figmol_magnet.probes( 100, 40 )
			const hit = $bog_figmol_magnet.snap( probes, [ 98, 118 ], 6 )

			$mol_assert_equal( hit?.line, 98 )

		},

		'a box around several boxes covers all of them'() {
			$mol_assert_like(
				$bog_figmol_magnet.bbox( [ [ 10, 20, 30, 40 ], [ 100, 0, 50, 10 ] ] ),
				[ 10, 0, 140, 60 ],
			)
		},

		'nothing picked is an empty box rather than an infinite one'() {
			$mol_assert_like( $bog_figmol_magnet.bbox( [] ), [ 0, 0, 0, 0 ] )
		},

		/**
		 * A neighbour standing across from the box is what a distance is asked
		 * about; one far above it is measured against something else.
		 */
		'a distance is measured to whatever stands across from the box'() {

			const gaps = $bog_figmol_magnet.gaps(
				[ 100, 100, 50, 50 ],
				[
					[ 200, 120, 50, 50 ],
					[ 200, 900, 50, 50 ],
				],
				false,
			)

			$mol_assert_equal( gaps.length, 1 )
			$mol_assert_equal( gaps[ 0 ].size, 50 )
			$mol_assert_equal( gaps[ 0 ].row, true )
			$mol_assert_equal( gaps[ 0 ].x, 150 )

			// Through the middle of what the two have in common: 120 … 150.
			$mol_assert_equal( gaps[ 0 ].y, 135 )

		},

		'both sides of both axes are measured at once'() {

			const gaps = $bog_figmol_magnet.gaps(
				[ 100, 100, 50, 50 ],
				[
					[ 0, 100, 60, 50 ],
					[ 200, 100, 50, 50 ],
					[ 100, 0, 50, 60 ],
					[ 100, 200, 50, 50 ],
				],
				false,
			)

			$mol_assert_like( gaps.map( gap => gap.size ), [ 40, 50, 40, 50 ] )
			$mol_assert_like( gaps.map( gap => gap.row ), [ true, true, false, false ] )

		},

		'the nearer of two neighbours on the same side is the one measured'() {

			const gaps = $bog_figmol_magnet.gaps(
				[ 100, 100, 50, 50 ],
				[
					[ 300, 100, 50, 50 ],
					[ 200, 100, 50, 50 ],
				],
				false,
			)

			$mol_assert_equal( gaps.length, 1 )
			$mol_assert_equal( gaps[ 0 ].size, 50 )

		},

		/**
		 * Asked about one particular element, the answer is the distance to it
		 * even when the two do not stand across from each other at all.
		 */
		'an element asked about by name is measured wherever it is'() {

			const box = [ 100, 100, 50, 50 ]
			const far = [ [ 300, 900, 50, 50 ] ]

			$mol_assert_equal( $bog_figmol_magnet.gaps( box, far, false ).length, 0 )

			const gaps = $bog_figmol_magnet.gaps( box, far, true )

			$mol_assert_like( gaps.map( gap => gap.size ), [ 150, 750 ] )

			// Nothing in common, so the ruler goes through the middle of the box.
			$mol_assert_equal( gaps[ 0 ].y, 125 )
			$mol_assert_equal( gaps[ 1 ].x, 125 )

		},

		'boxes that touch have no distance worth drawing'() {
			$mol_assert_like(
				$bog_figmol_magnet.gaps( [ 100, 100, 50, 50 ], [ [ 150, 100, 50, 50 ] ], false ),
				[],
			)
		},

	})

}
