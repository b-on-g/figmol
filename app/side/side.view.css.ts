namespace $ {

	$mol_style_define( $bog_figmol_app_side, {

		flex: {
			direction: 'column',
			shrink: 0,
		},
		width: '15rem',
		minHeight: 0,

		/**
		 * The rail scrolls as a whole. Five sections one under another do not fit
		 * a short window, and squeezing the layer tree to nothing to keep them all
		 * on screen would hide the one list that grows without limit.
		 */
		overflow: {
			x: 'hidden',
			y: 'auto',
		},
		background: {
			color: $mol_theme.card,
		},
		border: {
			right: {
				width: '1px',
				style: 'solid',
				color: $mol_theme.line,
			},
		},

	} )

}
