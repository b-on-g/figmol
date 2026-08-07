namespace $ {

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

	} )

}
