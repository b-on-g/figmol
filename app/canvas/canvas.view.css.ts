namespace $ {

	$mol_style_define( $bog_figmol_app_canvas, {

		flex: {
			grow: 1,
		},
		position: 'relative',
		overflow: 'hidden',
		outline: 'none',
		userSelect: 'none',
		touchAction: 'none',
		background: {
			color: $mol_theme.back,
		},

		World: {
			display: 'block',
			position: 'absolute',
			top: 0,
			left: 0,
			transformOrigin: '0 0',
		},

		Sheet: {
			display: 'block',
			position: 'relative',
			background: {
				color: '#ffffff',
			},
			boxShadow: '0 0.5rem 2rem #00000040',
		},

		/**
		 * Drawn on the sheet, so the viewport transform scales it along with
		 * everything else and the band stays glued to the page under it.
		 */
		Marquee: {
			position: 'absolute',
			boxSizing: 'border-box',
			background: {
				color: '#2f7ff71f',
			},
			border: {
				width: '1px',
				style: 'solid',
				color: '#2f7ff7',
			},
			pointerEvents: 'none',
			zIndex: 5,
		},

		'@': {

			/** Space is down: the next drag pans. An armed tool still wins below. */
			figmol_grab: {
				true: {
					cursor: 'grab',
				},
			},

			figmol_armed: {
				true: {
					cursor: 'crosshair',
				},
			},

		},

	} )

}
