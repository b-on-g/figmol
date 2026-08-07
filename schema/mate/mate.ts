namespace $ {

	/**
	 * One person looking at the site, as everybody else sees them.
	 *
	 * Every field here is a register its owner alone ever writes: the pawn is
	 * reached by the lord of the browser that made it, so two participants never
	 * touch the same unit and the ordered-list merge the document suffers from
	 * has nothing to merge.
	 */
	export class $bog_figmol_schema_mate extends $giper_baza_dict.with({

		/** Whatever the person calls themselves, empty until they say. */
		Name: $giper_baza_atom_text,

		/**
		 * Where they are, packed by `$bog_figmol_live`: the page or the component
		 * master they have open, the cursor in sheet pixels, and the wall clock of
		 * the write.
		 *
		 * One register rather than four: the cursor goes out many times a second,
		 * and every field would be a unit of its own on every one of them.
		 */
		Spot: $giper_baza_atom_text,

		/** Nodes they have picked, by link, separated by spaces. */
		Pick: $giper_baza_atom_text,

	}) {}

}
