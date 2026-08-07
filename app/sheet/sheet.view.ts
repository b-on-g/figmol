namespace $.$$ {

	/**
	 * The sheet the canvas draws on — a page of the site rather than a part of
	 * the editor, so it is painted by the theme of that site and not by the
	 * theme of the application around it.
	 *
	 * Every attribute here is the one the generator puts on the root of the
	 * built project, and every style is the rule it writes for it. That is the
	 * whole reason the sheet is a component of its own: one place deciding what
	 * a theme token means on screen, and a canvas that cannot drift away from
	 * the site it publishes.
	 *
	 * An unset colour is left empty on purpose — the style sheet below carries
	 * the defaults, and an inline value would only overwrite them with the same
	 * thing.
	 */
	export class $bog_figmol_app_sheet extends $.$bog_figmol_app_sheet {

		theme_base() {
			return this.store().theme_value( 'base' )
		}

		theme_lights() {
			return this.store().theme_value( 'lights' )
		}

		theme_font() {
			return $bog_figmol_theme.font_attr( this.store().theme_value( 'font' ) )
		}

		theme_family() {
			return $bog_figmol_theme.font_family( this.store().theme_value( 'font' ) )
		}

		theme_back() {
			return this.store().theme_value( 'back' )
		}

		theme_text() {
			return this.store().theme_value( 'text' )
		}

	}

}
