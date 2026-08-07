namespace $ {

	$mol_style_define( $bog_figmol_app_inspector, {

		flex: {
			direction: 'column',
			shrink: 0,
		},
		gap: $mol_gap.text,
		padding: $mol_gap.block,
		width: '16rem',
		overflow: {
			x: 'hidden',
			y: 'auto',
		},
		background: {
			color: $mol_theme.card,
		},
		border: {
			left: {
				width: '1px',
				style: 'solid',
				color: $mol_theme.line,
			},
		},

		Head: {
			flex: {
				shrink: 0,
			},
			font: {
				size: '0.875rem',
				weight: 'bold',
			},
		},

		Text: {
			minHeight: '4rem',
		},

		/** Four across, two down: lining up and spreading out, one axis per row. */
		Arrange: {
			flex: {
				shrink: 0,
			},
			display: 'grid',
			gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
			gap: '1px',
			margin: {
				top: $mol_gap.text,
			},
		},

		Comp_name: {
			flex: {
				grow: 1,
			},
			minWidth: 0,
			padding: {
				top: '0.25rem',
				bottom: '0.25rem',
			},
			overflow: 'hidden',
			textOverflow: 'ellipsis',
			whiteSpace: 'nowrap',
		},

		Comp_edit: {
			flex: {
				shrink: 0,
			},
			gap: $mol_gap.text,
			justify: {
				content: 'flex-start',
			},
			color: $mol_theme.current,
		},

		Comp_make: {
			flex: {
				shrink: 0,
			},
			gap: $mol_gap.text,
			justify: {
				content: 'flex-start',
			},
			margin: {
				top: $mol_gap.text,
			},
			color: $mol_theme.current,
		},

		Drop: {
			flex: {
				shrink: 0,
			},
			gap: $mol_gap.text,
			justify: {
				content: 'flex-start',
			},
			margin: {
				top: $mol_gap.text,
			},
			color: '#ef4444',
		},

	} )

}
