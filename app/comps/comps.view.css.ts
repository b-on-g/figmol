namespace $ {

	$mol_style_define( $bog_figmol_app_comps, {

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

		List: {
			flex: {
				direction: 'column',
			},
			gap: '1px',
		},

		/** Says where components come from, so an empty list is not a dead end. */
		Empty: {
			color: $mol_theme.shade,
			font: {
				size: '0.6875rem',
			},
		},

		/** The name and the wide button share a line; the pencil takes what is left. */
		Row: {
			flex: {
				direction: 'row',
			},
			align: {
				items: 'stretch',
			},
			gap: '1px',
		},

		Pick: {
			flex: {
				grow: 1,
				shrink: 1,
			},
			minWidth: 0,
		},

		Edit: {
			flex: {
				shrink: 0,
			},
			padding: {
				left: '0.25rem',
				right: '0.25rem',
			},
		},

		Editing: {
			flex: {
				direction: 'row',
				shrink: 0,
			},
			align: {
				items: 'center',
			},
			gap: $mol_gap.text,
			margin: {
				top: $mol_gap.text,
			},
			color: $mol_theme.shade,
			font: {
				size: '0.6875rem',
			},
		},

		Done: {
			flex: {
				shrink: 0,
			},
			gap: '0.25rem',
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
			color: '#ef4444',
		},

	} )

}
