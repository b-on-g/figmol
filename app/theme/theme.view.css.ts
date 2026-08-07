namespace $ {

	/** Caption over the control instead of beside it. */
	const figmol_theme_stacked: $mol_style_properties = {
		flex: {
			direction: 'column',
		},
		align: {
			items: 'stretch',
		},
		gap: '0.25rem',
	}

	$mol_style_define( $bog_figmol_app_theme, {

		flex: {
			direction: 'column',
			shrink: 0,
		},
		gap: $mol_gap.text,
		padding: $mol_gap.text,
		border: {
			bottom: {
				width: '1px',
				style: 'solid',
				color: $mol_theme.line,
			},
		},

		Head: {
			flex: {
				shrink: 0,
			},
			color: $mol_theme.shade,
			font: {
				size: '0.6875rem',
				weight: 'bold',
			},
			textTransform: 'uppercase',
			letterSpacing: '0.05em',
		},

		/**
		 * Four options do not fit beside a caption in a rail this narrow — they
		 * wrap into three ragged lines. A switch gets the line to itself, while
		 * the colours stay beside their captions where they read best.
		 */
		Field_font: figmol_theme_stacked,
		Field_base: figmol_theme_stacked,
		Field_lights: figmol_theme_stacked,

	} )

}
