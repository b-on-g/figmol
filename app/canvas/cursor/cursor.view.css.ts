namespace $ {

	$mol_style_define( $bog_figmol_app_canvas_cursor, {

		/**
		 * Sits at the top left of the overlay and is carried to where it belongs
		 * by a transform, which the canvas writes in screen pixels.
		 *
		 * The transform is what moves rather than `left` and `top`, and it is
		 * eased: positions arrive some tens of milliseconds apart, and a pointer
		 * that jumped between them would read as a stutter rather than as a hand.
		 */
		display: 'block',
		position: 'absolute',
		top: 0,
		left: 0,
		width: 0,
		height: 0,
		padding: 0,
		pointerEvents: 'none',
		zIndex: 20,
		transition: 'transform 0.12s linear',

		/**
		 * The pointer itself: a triangle made of borders, turned so that its tip
		 * sits exactly where the cursor is. The colour comes down as an inline
		 * style, since it belongs to the person rather than to the component.
		 */
		Arrow: {
			position: 'absolute',
			top: 0,
			left: 0,
			width: 0,
			height: 0,
			padding: 0,
			border: {
				left: {
					width: '5px',
					style: 'solid',
					color: 'transparent',
				},
				right: {
					width: '5px',
					style: 'solid',
					color: 'transparent',
				},
				bottom: {
					width: '15px',
					style: 'solid',
					color: '#0091ff',
				},
			},
			transformOrigin: '5px 0',
			transform: 'rotate( -45deg )',
			filter: 'drop-shadow( 0 1px 1px #00000059 )',
		},

		/** Name tag, hung below and to the right the way every editor hangs it. */
		Label: {
			position: 'absolute',
			top: '14px',
			left: '10px',
			padding: {
				top: '0.0625rem',
				bottom: '0.0625rem',
				left: '0.3125rem',
				right: '0.3125rem',
			},
			borderRadius: '0.25rem',
			color: '#ffffff',
			font: {
				size: '0.6875rem',
			},
			whiteSpace: 'nowrap',
			maxWidth: '10rem',
			overflow: 'hidden',
			textOverflow: 'ellipsis',
		},

	} )

}
