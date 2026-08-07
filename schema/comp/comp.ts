namespace $ {

	/**
	 * A component of the site: a name and a subtree of nodes drawn under it.
	 *
	 * The master is an ordinary node with ordinary children — the very same
	 * shapes the canvas draws anywhere else. Nothing marks it as special except
	 * being reachable from here instead of from a page, which is what lets the
	 * editor, the layer tree and the inspector work on it without knowing that
	 * a component is what they are looking at.
	 *
	 * An instance is a node of kind `inst` whose `Master` points back here. It
	 * holds no copy of anything: every instance reads this subtree, so an edit
	 * of the master shows up in all of them at once.
	 */
	export class $bog_figmol_schema_comp extends $giper_baza_entity.with({

		/** Frame the elements of the component live in. */
		Root: $giper_baza_atom_link.to( ()=> $bog_figmol_schema_node ),

	}) {}

}
