namespace $ {

	/**
	 * Families the component library ships with: the value its attribute takes,
	 * the css stack behind that value, and the name a human picks it by.
	 *
	 * Keys are spelled without dashes because they travel through `view.tree`
	 * dictionaries, where a dash is not part of an identifier.
	 */
	const figmol_theme_fonts: Readonly< Record< string, readonly [ string, string, string ] > > = {
		inter: [ 'inter', "Inter, system-ui, sans-serif", 'Inter' ],
		manrope: [ 'manrope', "Manrope, system-ui, sans-serif", 'Manrope' ],
		dmsans: [ 'dm-sans', "'DM Sans', system-ui, sans-serif", 'DM Sans' ],
		garamond: [ 'eb-garamond', "'EB Garamond', Georgia, serif", 'Garamond' ],
	}

	/** Neutral palettes of the library, by the value of its `base` attribute. */
	const figmol_theme_bases: Readonly< Record< string, string > > = {
		slate: 'Slate',
		stone: 'Stone',
		zinc: 'Zinc',
		gray: 'Gray',
	}

	const figmol_theme_lights: Readonly< Record< string, string > > = {
		light: 'Light',
		dark: 'Dark',
	}

	const figmol_theme_hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

	/**
	 * The look of a site, as a handful of tokens.
	 *
	 * Plain data and pure functions, with no idea where the values came from:
	 * the editor reads them out of the Baza to paint the sheet, and the
	 * generator reads them out of a snapshot to paint the published page. One
	 * answer to "what does `font` mean" is the whole point — a canvas and a site
	 * that disagree about the theme is a canvas that lies.
	 */
	export class $bog_figmol_theme {

		/**
		 * What a token means when nothing is written into it.
		 *
		 * `back` and `text` are deliberately empty: an unset colour is not white,
		 * it is "whatever the sheet and the library already say", and the
		 * generated project carries no rule for it at all.
		 */
		static readonly fallback: Readonly< Record< string, string > > = {
			back: '',
			text: '',
			accent: '#2563eb',
			font: 'inter',
			base: 'slate',
			lights: 'light',
		}

		static readonly fonts = Object.keys( figmol_theme_fonts )
		static readonly bases = Object.keys( figmol_theme_bases )
		static readonly lights = Object.keys( figmol_theme_lights )

		/** Captions of every option, for the switches of the theme panel. */
		static font_titles() {
			const res = {} as Record< string, string >
			for( const key of this.fonts ) res[ key ] = figmol_theme_fonts[ key ][ 2 ]
			return res
		}

		static base_titles() {
			return { ... figmol_theme_bases }
		}

		static lights_titles() {
			return { ... figmol_theme_lights }
		}

		/** Value of a token, with the fallback for anything unset or unknown. */
		static value( theme: Readonly< Record< string, string > >, key: string ) {

			const raw = String( theme[ key ] ?? '' ).trim()
			const back = this.fallback[ key ] ?? ''

			switch( key ) {
				case 'font': return raw in figmol_theme_fonts ? raw : back
				case 'base': return raw in figmol_theme_bases ? raw : back
				case 'lights': return raw in figmol_theme_lights ? raw : back
				case 'back':
				case 'text':
				case 'accent': return figmol_theme_hex.test( raw ) ? raw : back
			}

			return raw || back
		}

		/** Value of the `bog_builderui_font_body` attribute for a font token. */
		static font_attr( key: string ) {
			return figmol_theme_fonts[ key ]?.[ 0 ] ?? figmol_theme_fonts.inter[ 0 ]
		}

		/** Css font stack of a font token. */
		static font_family( key: string ) {
			return figmol_theme_fonts[ key ]?.[ 1 ] ?? figmol_theme_fonts.inter[ 1 ]
		}

	}

}
