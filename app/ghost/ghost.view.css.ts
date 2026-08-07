namespace $ {

	$mol_style_define( $bog_figmol_app_ghost, {

		/**
		 * Fills the instance and positions the master frame inside it, which is
		 * absolute like every other shape. Clipped, because the master keeps its
		 * own layout and an instance made smaller than it must not spill.
		 */
		position: 'absolute',
		top: 0,
		left: 0,
		width: '100%',
		height: '100%',
		overflow: 'hidden',

		/** A press over an instance belongs to the instance, not to the master. */
		pointerEvents: 'none',

	} )

}
