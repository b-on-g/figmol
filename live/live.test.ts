namespace $ {

	/**
	 * Everything checked here is the part of presence that has no Baza in it:
	 * the palette, the packing of a spot and the reading of it back. The channel
	 * itself needs a Land, two browsers and a network, and is checked by opening
	 * the editor twice.
	 */
	$mol_test({

		'A colour belongs to a lord, not to the order they arrived in'() {

			const one = $bog_figmol_live.color( 'sQ1nV8kL' )
			const two = $bog_figmol_live.color( 'sQ1nV8kL' )

			$mol_assert_equal( one, two )
			$mol_assert_ok( $bog_figmol_live.colors.includes( one ) )
		},

		'Every lord gets a colour of the palette, however long its name'() {

			for( const lord of [ '', 'a', 'zzzzzzzzzzzzzzzzzzzzzzzz', '9_-Xq' ] ) {
				const slot = $bog_figmol_live.slot( lord )
				$mol_assert_ok( slot >= 0 && slot < $bog_figmol_live.colors.length )
			}
		},

		'The palette is spread rather than crowded into one colour'() {

			const lords = [ 'aaa', 'bbb', 'ccc', 'ddd', 'eee', 'fff', 'ggg', 'hhh' ]
			const slots = new Set( lords.map( lord => $bog_figmol_live.slot( lord ) ) )

			$mol_assert_ok( slots.size > 2 )
		},

		'Somebody who has not given a name is called by the short of their lord'() {
			$mol_assert_equal( $bog_figmol_live.label( 'sQ1nV8kL' ), 'sQ1n' )
			$mol_assert_equal( $bog_figmol_live.label( '' ), '?' )
		},

		'A spot survives the trip through the register'() {

			const packed = $bog_figmol_live.spot_pack( 'page1', 120.4, -8.6, 1700000000000 )
			const spot = $bog_figmol_live.spot_read( packed )

			$mol_assert_equal( spot.place, 'page1' )
			$mol_assert_equal( spot.x, 120 )
			$mol_assert_equal( spot.y, -9 )
			$mol_assert_equal( spot.wall, 1700000000000 )
		},

		'A cursor that is nowhere is packed as nowhere'() {

			const spot = $bog_figmol_live.spot_read(
				$bog_figmol_live.spot_pack( 'page1', null, null, 42 )
			)

			$mol_assert_equal( spot.place, 'page1' )
			$mol_assert_equal( spot.x, null )
			$mol_assert_equal( spot.y, null )
			$mol_assert_equal( spot.wall, 42 )
		},

		'A cursor at the origin is a cursor, not an absent one'() {

			const spot = $bog_figmol_live.spot_read(
				$bog_figmol_live.spot_pack( 'page1', 0, 0, 42 )
			)

			$mol_assert_equal( spot.x, 0 )
			$mol_assert_equal( spot.y, 0 )
		},

		'An empty register is somebody who has never said anything'() {

			const spot = $bog_figmol_live.spot_read( '' )

			$mol_assert_equal( spot.place, '' )
			$mol_assert_equal( spot.x, null )
			$mol_assert_equal( spot.y, null )
			$mol_assert_equal( spot.wall, 0 )
		},

		'Rubbish in the register is read as nothing rather than as a cursor'() {

			const spot = $bog_figmol_live.spot_read( 'page1|left|down|soon' )

			$mol_assert_equal( spot.place, 'page1' )
			$mol_assert_equal( spot.x, null )
			$mol_assert_equal( spot.y, null )
			$mol_assert_equal( spot.wall, 0 )
		},

		'Two spots differing only by the clock differ as strings'() {

			const one = $bog_figmol_live.spot_pack( 'page1', 10, 10, 1 )
			const two = $bog_figmol_live.spot_pack( 'page1', 10, 10, 2 )

			$mol_assert_ok( one !== two )
		},

		'A cursor that has not moved packs the same, so nothing is written'() {

			const one = $bog_figmol_live.spot_pack( 'page1', 10.2, 10.4, 0 )
			const two = $bog_figmol_live.spot_pack( 'page1', 10.1, 10.3, 0 )

			$mol_assert_equal( one, two )
		},

		'A selection survives the trip through the register'() {

			const ids = [ 'aQ_1', 'bW_2', 'cE_3' ]
			$mol_assert_equal( $bog_figmol_live.pick_read( $bog_figmol_live.pick_pack( ids ) ), ids )
		},

		'Nothing picked reads back as nothing picked'() {
			$mol_assert_equal( $bog_figmol_live.pick_pack([]), '' )
			$mol_assert_equal( $bog_figmol_live.pick_read( '' ), [] )
			$mol_assert_equal( $bog_figmol_live.pick_read( '   ' ), [] )
		},

	})

}
