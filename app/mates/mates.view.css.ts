namespace $ {

	$mol_style_define( $bog_figmol_app_mates, {

		flex: {
			direction: 'row',
			shrink: 0,
		},
		align: {
			items: 'center',
		},
		gap: '0.25rem',

		/** Short on purpose: a name is a word, and the header is not a form. */
		Name: {
			flex: {
				shrink: 0,
			},
			width: '6rem',
			padding: {
				top: '0.125rem',
				bottom: '0.125rem',
				left: '0.375rem',
				right: '0.375rem',
			},
			font: {
				size: '0.75rem',
			},
		},

		Chip: {
			flex: {
				direction: 'row',
				shrink: 0,
			},
			align: {
				items: 'center',
			},
			gap: '0.25rem',
			padding: {
				top: '0.125rem',
				bottom: '0.125rem',
				left: '0.375rem',
				right: '0.5rem',
			},
			background: {
				color: $mol_theme.back,
			},
			borderRadius: '999px',
			color: $mol_theme.text,
			font: {
				size: '0.75rem',
			},
			whiteSpace: 'nowrap',
			maxWidth: '8rem',
			overflow: 'hidden',
			textOverflow: 'ellipsis',
		},

		Dot: {
			flex: {
				shrink: 0,
			},
			width: '0.5rem',
			height: '0.5rem',
			minWidth: '0.5rem',
			minHeight: '0.5rem',
			borderRadius: '50%',
		},

	} )

}
