namespace $ {

	/** Three boxes of different sizes, deliberately out of order. */
	const figmol_arrange_test_boxes = [
		[ 100, 40, 60, 20 ],
		[ 20, 10, 40, 60 ],
		[ 200, 80, 20, 30 ],
	] as readonly ( readonly number[] )[]

	$mol_test({

		'aligning to an edge puts every box against the same line'() {

			const left = $bog_figmol_app_arrange.place( 'left', figmol_arrange_test_boxes )
			$mol_assert_like( left.map( box => box[ 0 ] ), [ 20, 20, 20 ] )

			// Rightmost edge is 220, so each box starts its own width short of it.
			const right = $bog_figmol_app_arrange.place( 'right', figmol_arrange_test_boxes )
			$mol_assert_like( right.map( box => box[ 0 ] ), [ 160, 180, 200 ] )

			const top = $bog_figmol_app_arrange.place( 'top', figmol_arrange_test_boxes )
			$mol_assert_like( top.map( box => box[ 1 ] ), [ 10, 10, 10 ] )

			const bottom = $bog_figmol_app_arrange.place( 'bottom', figmol_arrange_test_boxes )
			$mol_assert_like( bottom.map( box => box[ 1 ] ), [ 90, 50, 80 ] )

		},

		/** The middle is of the whole selection, not of any one box in it. */
		'centring measures the box the selection makes'() {

			const across = $bog_figmol_app_arrange.place( 'hcenter', figmol_arrange_test_boxes )
			$mol_assert_like( across.map( box => box[ 0 ] ), [ 90, 100, 110 ] )

			const down = $bog_figmol_app_arrange.place( 'vcenter', figmol_arrange_test_boxes )
			$mol_assert_like( down.map( box => box[ 1 ] ), [ 50, 30, 45 ] )

		},

		/** Only the coordinate of the axis being aligned is allowed to change. */
		'aligning across leaves the other axis alone'() {

			const left = $bog_figmol_app_arrange.place( 'left', figmol_arrange_test_boxes )

			$mol_assert_like( left.map( box => box[ 1 ] ), [ 40, 10, 80 ] )

		},

		/**
		 * Widths differ, so equal gaps are not equal steps: 20…220 is 200 wide,
		 * the boxes take up 120 of it, and the two gaps get 40 each.
		 */
		'distributing evens out the gaps and keeps the outer two put'() {

			const res = $bog_figmol_app_arrange.place( 'hspace', figmol_arrange_test_boxes )

			$mol_assert_like( res.map( box => box[ 0 ] ), [ 100, 20, 200 ] )

			const sorted = [ ... res ].sort( ( a, b )=> a[ 0 ] - b[ 0 ] )
			const sizes = [ 40, 60, 20 ]

			for( let at = 1; at < sorted.length; ++at ) {
				$mol_assert_equal( sorted[ at ][ 0 ] - ( sorted[ at - 1 ][ 0 ] + sizes[ at - 1 ] ), 40 )
			}

		},

		'distributing down uses the heights'() {

			const res = $bog_figmol_app_arrange.place( 'vspace', figmol_arrange_test_boxes )

			// 10…110 is 100 tall, the three boxes take 110 of it, so the gap is -5.
			$mol_assert_like( res.map( box => box[ 1 ] ), [ 65, 10, 80 ] )

		},

		/** Two boxes have no gap between them to even out, and one has no lot. */
		'a selection too small to arrange is left where it is'() {

			const pair = figmol_arrange_test_boxes.slice( 0, 2 )
			$mol_assert_like(
				$bog_figmol_app_arrange.place( 'hspace', pair ),
				[ [ 100, 40 ], [ 20, 10 ] ],
			)

			const lone = figmol_arrange_test_boxes.slice( 0, 1 )
			$mol_assert_like( $bog_figmol_app_arrange.place( 'left', lone ), [ [ 100, 40 ] ] )

		},

		'an unknown mode moves nothing'() {

			$mol_assert_like(
				$bog_figmol_app_arrange.place( 'sideways', figmol_arrange_test_boxes ),
				[ [ 100, 40 ], [ 20, 10 ], [ 200, 80 ] ],
			)

		},

	})

}
