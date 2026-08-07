namespace $.$$ {

	/**
	 * The theme of the site, in the left rail.
	 *
	 * Every field writes one token straight into the document, and both the
	 * sheet and the generator read those same tokens back — so what the canvas
	 * shows after a click here is what the published page will show. Nothing is
	 * previewed and nothing is applied: there is one copy of the value, and it
	 * is the one in the Baza.
	 *
	 * The switches offer what the component library actually ships with. A free
	 * text colour is a colour anybody can type, but a family the library has no
	 * font for would simply not arrive on the built page.
	 */
	export class $bog_figmol_app_theme extends $.$bog_figmol_app_theme {

		font_options() {
			return $bog_figmol_theme.font_titles()
		}

		base_options() {
			return $bog_figmol_theme.base_titles()
		}

		lights_options() {
			return $bog_figmol_theme.lights_titles()
		}

		back( next?: string ) {
			return this.store().theme( 'back', next )
		}

		text( next?: string ) {
			return this.store().theme( 'text', next )
		}

		accent( next?: string ) {
			return this.store().theme( 'accent', next )
		}

		/**
		 * The switches show the value that is in force rather than the one that
		 * was written: a site nobody has themed yet has an empty `font`, and a
		 * row of buttons with none of them pressed would be a lie about what the
		 * canvas is drawing.
		 */
		font( next?: string ) {
			return this.token( 'font', next )
		}

		base( next?: string ) {
			return this.token( 'base', next )
		}

		lights( next?: string ) {
			return this.token( 'lights', next )
		}

		token( key: string, next?: string ) {
			const store = this.store()
			if( next !== undefined ) store.theme( key, next )
			return store.theme_value( key )
		}

	}

}
