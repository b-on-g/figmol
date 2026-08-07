namespace $ {

	/**
	 * A store whose writes go into a plain object instead of into the Baza.
	 *
	 * Only the four raw writers are replaced — everything the journal does above
	 * them is the real code, which is the part worth testing: a Land of its own
	 * per case would test the Baza instead.
	 */
	const figmol_store_test_props = ( store: $bog_figmol_store )=> {

		const values = {} as Record< string, string >

		store.prop_read = ( id: string, key: string )=> values[ id + ':' + key ] ?? ''
		store.prop_write = ( id: string, key: string, val: string )=> { values[ id + ':' + key ] = val }

		return values
	}

	const figmol_store_test_nums = ( store: $bog_figmol_store )=> {

		const values = {} as Record< string, number >

		store.num_read = ( id: string, field: string )=> values[ id + ':' + field ] ?? 0
		store.num_write = ( id: string, field: string, val: number )=> { values[ id + ':' + field ] = val }

		return values
	}

	/** A frame with three children, none of which is anywhere near the Baza. */
	const figmol_store_test_kids = ( store: $bog_figmol_store, kids: string[] )=> {

		store.parent = ()=> 'root'
		store.kids = ( id: string )=> id === 'root' ? kids : []

		store.kid_cut = ( host: string, id: string )=> {
			kids.splice( 0, kids.length, ... kids.filter( kid => kid !== id ) )
		}

		store.kid_put = ( host: string, id: string, at: number )=> {
			const rest = kids.filter( kid => kid !== id )
			rest.splice( at < 0 ? rest.length : at, 0, id )
			kids.splice( 0, kids.length, ... rest )
		}

		return kids
	}

	/**
	 * An ordered list of links in a Land of its own, filled the way the store
	 * fills one.
	 *
	 * The ids are read back rather than remembered: a link goes into the Baza
	 * bare and comes out resolved against the Land, and the resolved form is the
	 * only one the editor ever holds — every id it has came off a Pawn.
	 */
	const figmol_store_test_list = ( $: $, size: number )=> {

		const store = new $bog_figmol_store
		const land = $.$giper_baza_land.make({ $ })
		const list = land.Pawn( $giper_baza_list_link ).Data()

		for( let i = 0; i < size; ++i ) store.list_put( list, $giper_baza_link.from_int( i + 2 ).str, -1 )

		return list
	}

	$mol_test({

		'a write remembers the value it replaced'() {

			const store = new $bog_figmol_store
			const values = figmol_store_test_props( store )

			store.prop_edit( 'a', 'text', 'Hello' )
			$mol_assert_equal( values[ 'a:text' ], 'Hello' )

			$mol_assert_equal( store.can_undo(), true )
			$mol_assert_equal( store.can_redo(), false )

			store.undo()
			$mol_assert_equal( values[ 'a:text' ], '' )
			$mol_assert_equal( store.can_redo(), true )

			store.redo()
			$mol_assert_equal( values[ 'a:text' ], 'Hello' )

		},

		/** Typing a word is one step back, not one step per letter. */
		'a burst of writes into one field folds into a single step'() {

			const store = new $bog_figmol_store
			const values = figmol_store_test_props( store )

			store.prop_edit( 'a', 'text', 'H' )
			store.prop_edit( 'a', 'text', 'He' )
			store.prop_edit( 'a', 'text', 'Hey' )

			store.undo()

			$mol_assert_equal( values[ 'a:text' ], '' )
			$mol_assert_equal( store.can_undo(), false )

			store.redo()
			$mol_assert_equal( values[ 'a:text' ], 'Hey' )

		},

		'writes into different fields stay different steps'() {

			const store = new $bog_figmol_store
			const values = figmol_store_test_nums( store )

			store.num_edit( 'a', 'x', 10 )
			store.num_edit( 'a', 'y', 20 )

			store.undo()
			$mol_assert_equal( values[ 'a:y' ], 0 )
			$mol_assert_equal( values[ 'a:x' ], 10 )

			store.undo()
			$mol_assert_equal( values[ 'a:x' ], 0 )

		},

		'a write that changes nothing is not a step'() {

			const store = new $bog_figmol_store
			figmol_store_test_props( store )

			store.prop_edit( 'a', 'text', '' )

			$mol_assert_equal( store.can_undo(), false )

		},

		/**
		 * Deleting only unlinks the node — the Baza is append-only — so taking the
		 * deletion back puts the very same link where it was.
		 */
		'an element comes back where it was deleted from'() {

			const store = new $bog_figmol_store
			const kids = figmol_store_test_kids( store, [ 'a', 'b', 'c' ] )

			store.node_drop( 'b' )
			$mol_assert_like( kids, [ 'a', 'c' ] )

			store.undo()
			$mol_assert_like( kids, [ 'a', 'b', 'c' ] )

			store.redo()
			$mol_assert_like( kids, [ 'a', 'c' ] )

		},

		/** Deleting five elements is one gesture, so it has to cost one step back. */
		'writes of a single gesture fold into one step'() {

			const store = new $bog_figmol_store
			const kids = figmol_store_test_kids( store, [ 'a', 'b', 'c' ] )

			store.group( ()=> {
				store.node_drop( 'a' )
				store.node_drop( 'b' )
			} )

			$mol_assert_like( kids, [ 'c' ] )

			store.undo()
			$mol_assert_like( kids, [ 'a', 'b', 'c' ] )
			$mol_assert_equal( store.can_undo(), false )

			store.redo()
			$mol_assert_like( kids, [ 'c' ] )

		},

		/** One write is a step of its own, and folding it would only hide it. */
		'a gesture that wrote once stays an ordinary step'() {

			const store = new $bog_figmol_store
			const values = figmol_store_test_props( store )

			store.group( ()=> store.prop_edit( 'a', 'text', 'one' ) )
			store.prop_edit( 'b', 'text', 'two' )

			store.undo()
			$mol_assert_equal( values[ 'b:text' ], '' )
			$mol_assert_equal( values[ 'a:text' ], 'one' )

			store.undo()
			$mol_assert_equal( values[ 'a:text' ], '' )

		},

		/** Undoing a step must not be recorded as a step of its own. */
		'walking the journal does not write into it'() {

			const store = new $bog_figmol_store
			const values = figmol_store_test_props( store )

			store.prop_edit( 'a', 'text', 'one' )
			store.prop_edit( 'b', 'text', 'two' )

			store.undo()
			store.undo()

			$mol_assert_equal( store.can_undo(), false )
			$mol_assert_equal( values[ 'a:text' ], '' )
			$mol_assert_equal( values[ 'b:text' ], '' )

			store.redo()
			store.redo()

			$mol_assert_equal( values[ 'a:text' ], 'one' )
			$mol_assert_equal( values[ 'b:text' ], 'two' )

		},

		/** A new change is a new future: whatever was undone is not coming back. */
		'a change after an undo drops the redo'() {

			const store = new $bog_figmol_store
			figmol_store_test_props( store )

			store.prop_edit( 'a', 'text', 'one' )
			store.undo()

			$mol_assert_equal( store.can_redo(), true )

			store.prop_edit( 'a', 'text', 'other' )

			$mol_assert_equal( store.can_redo(), false )

		},

		/**
		 * A component holding itself, however far round the loop, would be a page
		 * that draws until the stack runs out. The only way to build one is to
		 * drop an instance inside a master, so that is where it is refused.
		 */
		'a component that would hold itself is refused'() {

			const store = new $bog_figmol_store

			const roots = { a: 'ra', b: 'rb', c: 'rc' } as Record< string, string >

			store.comp_root = ( id: string )=> roots[ id ] ?? ''
			store.master = ( id: string )=> id === 'inst_a' ? 'a' : ''
			store.kids = ( id: string )=> id === 'rb' ? [ 'deep' ] : id === 'deep' ? [ 'inst_a' ] : []
			store.comp_current = ()=> 'a'

			$mol_assert_equal( store.comp_cyclic( 'a' ), true )
			$mol_assert_equal( store.comp_cyclic( 'b' ), true )
			$mol_assert_equal( store.comp_cyclic( 'c' ), false )

		},

		/** Outside a master there is no loop to make, whatever is dropped. */
		'a component dropped on a page is never a loop'() {

			const store = new $bog_figmol_store

			store.comp_root = ()=> 'rb'
			store.master = ()=> ''
			store.kids = ()=> []
			store.comp_current = ()=> ''

			$mol_assert_equal( store.comp_cyclic( 'b' ), false )

		},

		'an address naming nonsense falls back to the site of this account'() {

			const store = new $bog_figmol_store
			store.share_id = ()=> 'not a link at all'

			$mol_assert_equal( store.share_link(), null )

		},

		/**
		 * Nothing keeps a link out of two seats of one list — two peers moving the
		 * same element at once put it in both — and a node drawn twice would be
		 * dragged as two. The seat it was listed in first is the one it keeps.
		 */
		'a child listed twice is a child once'() {

			const store = new $bog_figmol_store
			store.kids_read = ()=> [ 'a', 'b', 'a', 'c', 'b' ]

			$mol_assert_like( store.kids( 'root' ), [ 'a', 'b', 'c' ] )

		},

		'a list with nothing repeated is handed back untouched'() {

			const items = [ 'a', 'b', 'c' ]

			$mol_assert_equal( $bog_figmol_store.dedup( items, id => id ), items )

		},

		/**
		 * A drag writes what it changed and nothing else: the element leaves one
		 * seat and takes another, which is two units on a frame of eight and two
		 * on a frame of forty. Writing the list back as a whole cost a unit per
		 * element that shifted — and each of those units was a rewrite of a Sand
		 * belonging to some other element, which is the write two peers cannot
		 * merge.
		 */
		'a reorder costs the same on a short list and on a long one'( $ ) {

			const cost = ( size: number )=> {

				const list = figmol_store_test_list( $, size )
				const ids = list.items().map( link => link.str )

				$mol_assert_equal( ids.length, size )

				const land = list.land()
				let posts = 0
				const post = land.post.bind( land )
				land.post = ( ... args: Parameters< typeof post > )=> {
					++ posts
					return post( ... args )
				}

				new $bog_figmol_store().list_put( list, ids[ size - 2 ], 1 )

				$mol_assert_like(
					list.items().map( link => link.str ),
					[ ids[ 0 ], ids[ size - 2 ], ... ids.slice( 1, size - 2 ), ids[ size - 1 ] ],
				)

				return posts
			}

			$mol_assert_equal( cost( 8 ), 2 )
			$mol_assert_equal( cost( 40 ), 2 )

		},

		/** Putting a link where it already sits leaves the list as it was. */
		'a reorder that changes nothing still ends up in order'( $ ) {

			const store = new $bog_figmol_store
			const list = figmol_store_test_list( $, 5 )
			const ids = list.items().map( link => link.str )

			store.list_put( list, ids[ 2 ], 2 )
			$mol_assert_like( list.items().map( link => link.str ), ids )

			store.list_put( list, ids[ 0 ], 99 )
			$mol_assert_like( list.items().map( link => link.str ), [ ... ids.slice( 1 ), ids[ 0 ] ] )

		},

	})

}
