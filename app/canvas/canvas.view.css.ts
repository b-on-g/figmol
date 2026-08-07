namespace $ {

	/** Grip of the frame drawn around several elements. */
	const figmol_canvas_grip: $mol_style_properties = {
		position: 'absolute',
		width: '0.5rem',
		height: '0.5rem',
		minWidth: '0.5rem',
		minHeight: '0.5rem',
		boxSizing: 'border-box',
		background: {
			color: '#ffffff',
		},
		border: {
			width: '1px',
			style: 'solid',
			color: '#2f7ff7',
		},
		borderRadius: '2px',
		pointerEvents: 'auto',
	}

	const figmol_canvas_item: $mol_style_properties = {
		justify: {
			content: 'flex-start',
		},
		padding: {
			top: '0.25rem',
			bottom: '0.25rem',
			left: '0.75rem',
			right: '0.75rem',
		},
		borderRadius: '0',
		whiteSpace: 'nowrap',
	}

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

		/**
		 * Everything drawn over the sheet instead of on it, in screen pixels: a
		 * guide has to stay a hairline and a label has to stay readable however
		 * far the page is zoomed out. Presses go through it to the canvas, except
		 * on the grips and the menu, which take their own.
		 */
		Overlay: {
			display: 'block',
			position: 'absolute',
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			pointerEvents: 'none',
		},

		Guide_x: {
			position: 'absolute',
			width: '1px',
			background: {
				color: '#f24822',
			},
		},

		Guide_y: {
			position: 'absolute',
			height: '1px',
			background: {
				color: '#f24822',
			},
		},

		/** The rule itself is the line: one of its two sizes is a single pixel. */
		Measure: {
			display: 'block',
			position: 'absolute',
			background: {
				color: '#ec4899',
			},
		},

		Measure_label: {
			position: 'absolute',
			left: '50%',
			top: '50%',
			transform: 'translate(-50%, -50%)',
			padding: {
				top: '1px',
				bottom: '1px',
				left: '4px',
				right: '4px',
			},
			background: {
				color: '#ec4899',
			},
			color: '#ffffff',
			font: {
				size: '0.625rem',
				family: 'sans-serif',
			},
			borderRadius: '2px',
			whiteSpace: 'nowrap',
		},

		Group: {
			position: 'absolute',
			boxSizing: 'border-box',
			border: {
				width: '1px',
				style: 'solid',
				color: '#2f7ff7',
			},
		},

		Group_nw: {
			... figmol_canvas_grip,
			top: '-0.25rem',
			left: '-0.25rem',
			cursor: 'nwse-resize',
		},

		Group_ne: {
			... figmol_canvas_grip,
			top: '-0.25rem',
			right: '-0.25rem',
			cursor: 'nesw-resize',
		},

		Group_sw: {
			... figmol_canvas_grip,
			bottom: '-0.25rem',
			left: '-0.25rem',
			cursor: 'nesw-resize',
		},

		Group_se: {
			... figmol_canvas_grip,
			bottom: '-0.25rem',
			right: '-0.25rem',
			cursor: 'nwse-resize',
		},

		Menu: {
			position: 'absolute',
			flex: {
				direction: 'column',
			},
			minWidth: '11rem',
			padding: {
				top: '0.25rem',
				bottom: '0.25rem',
				left: 0,
				right: 0,
			},
			background: {
				color: $mol_theme.card,
			},
			border: {
				width: '1px',
				style: 'solid',
				color: $mol_theme.line,
				radius: $mol_gap.round,
			},
			boxShadow: '0 0.5rem 1.5rem #00000040',
			pointerEvents: 'auto',
			cursor: 'default',
		},

		Menu_copy: { ... figmol_canvas_item },
		Menu_front: { ... figmol_canvas_item },
		Menu_back: { ... figmol_canvas_item },
		Menu_wrap: { ... figmol_canvas_item },
		Menu_drop: { ... figmol_canvas_item },

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
