namespace $ {

	$mol_test({

		/** An unset token is not an empty look, it is the look nobody changed. */
		'a token nobody wrote comes back as the default'() {

			$mol_assert_equal( $bog_figmol_theme.value( {}, 'base' ), 'slate' )
			$mol_assert_equal( $bog_figmol_theme.value( {}, 'lights' ), 'light' )
			$mol_assert_equal( $bog_figmol_theme.value( {}, 'font' ), 'inter' )
			$mol_assert_equal( $bog_figmol_theme.value( {}, 'accent' ), '#2563eb' )

			// A page is white because the sheet is, not because the theme says so:
			// an unset colour has to reach the generator as nothing at all.
			$mol_assert_equal( $bog_figmol_theme.value( {}, 'back' ), '' )
			$mol_assert_equal( $bog_figmol_theme.value( {}, 'text' ), '' )

		},

		/**
		 * Anything the component library has no rule for would arrive on the built
		 * page as an attribute that matches nothing, so it never leaves here.
		 */
		'a value the library knows nothing about falls back'() {

			$mol_assert_equal( $bog_figmol_theme.value( { base: 'neon' }, 'base' ), 'slate' )
			$mol_assert_equal( $bog_figmol_theme.value( { lights: 'dusk' }, 'lights' ), 'light' )
			$mol_assert_equal( $bog_figmol_theme.value( { font: 'Comic Sans' }, 'font' ), 'inter' )
			$mol_assert_equal( $bog_figmol_theme.value( { accent: 'red' }, 'accent' ), '#2563eb' )

		},

		'a written value is taken as it is'() {

			$mol_assert_equal( $bog_figmol_theme.value( { base: 'zinc' }, 'base' ), 'zinc' )
			$mol_assert_equal( $bog_figmol_theme.value( { lights: 'dark' }, 'lights' ), 'dark' )
			$mol_assert_equal( $bog_figmol_theme.value( { font: 'dmsans' }, 'font' ), 'dmsans' )
			$mol_assert_equal( $bog_figmol_theme.value( { back: '#0F172A' }, 'back' ), '#0F172A' )

		},

		/** The key travels through view.tree dictionaries, the attribute does not. */
		'a font token knows both its attribute and its stack'() {

			$mol_assert_equal( $bog_figmol_theme.font_attr( 'dmsans' ), 'dm-sans' )
			$mol_assert_equal( $bog_figmol_theme.font_attr( 'garamond' ), 'eb-garamond' )
			$mol_assert_equal( $bog_figmol_theme.font_attr( 'nonsense' ), 'inter' )

			$mol_assert_ok( $bog_figmol_theme.font_family( 'manrope' ).startsWith( 'Manrope' ) )
			$mol_assert_ok( $bog_figmol_theme.font_family( 'nonsense' ).startsWith( 'Inter' ) )

		},

		'every option offered has a caption'() {

			for( const key of $bog_figmol_theme.fonts ) {
				$mol_assert_ok( !!$bog_figmol_theme.font_titles()[ key ] )
			}

			for( const key of $bog_figmol_theme.bases ) {
				$mol_assert_ok( !!$bog_figmol_theme.base_titles()[ key ] )
			}

			$mol_assert_like( $bog_figmol_theme.lights, [ 'light', 'dark' ] )

		},

	})

}
