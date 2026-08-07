namespace $ {

	/** Where the editor is pretending to live for the length of a test. */
	const figmol_publish_test_page = 'https://figmol.example/figmol/'

	/**
	 * A panel with the outside world replaced by three variables: the storage it
	 * would keep the token in, and the address bar it would rewrite and leave.
	 *
	 * Nothing here reaches the network — every case below ends before the
	 * exchange, which is the only step that would.
	 */
	function figmol_publish_test_panel() {

		const panel = new $bog_figmol_deploy_publish as $.$$.$bog_figmol_deploy_publish

		const kept = {
			token: '',
			account: '',
			nonce: '',
			owner: '',
			orgs: [] as readonly string[],
			went: '',
			address: figmol_publish_test_page,
		}

		panel.token = ( next?: string )=> next === undefined ? kept.token : ( kept.token = next )
		panel.account = ( next?: string )=> next === undefined ? kept.account : ( kept.account = next )
		panel.nonce = ( next?: string )=> next === undefined ? kept.nonce : ( kept.nonce = next )
		panel.owner_wanted = ( next?: string )=> next === undefined ? kept.owner : ( kept.owner = next )

		// The one call the panel makes on its own, and the only reason a case
		// below would reach the network.
		panel.orgs = ()=> kept.orgs

		panel.go = ( uri: string )=> { kept.went = uri }
		panel.oauth_clean = ( href: string )=> { kept.address = $bog_figmol_deploy_github.oauth_clean( href ) }
		panel.oauth_back = ()=> figmol_publish_test_page

		// Wording is the business of the locale files, and reading those is the
		// business of a browser — outside a bundle there is nothing to read.
		panel.signed_label = ()=> 'Signed in as'
		panel.token_label = ()=> 'A token is in place'
		panel.login_wrong = ()=> 'Start it again'
		panel.name_hint = ()=> 'One lowercase word'
		panel.site_hint = ()=> 'The site will land on'
		panel.conflict_hint = ()=> 'already exists'

		return { panel, kept }
	}

	$mol_test( {

		'a fresh panel offers to sign in, a signed in one offers to leave'() {

			const guest = figmol_publish_test_panel()
			$mol_assert_like( guest.panel.auth_head(), [ guest.panel.Login(), guest.panel.Login_hint() ] )

			const known = figmol_publish_test_panel()
			known.panel.token( 'ghp_secret' )
			$mol_assert_like( known.panel.auth_head(), [ known.panel.Account() ] )
		},

		/**
		 * The field writes on every keystroke. If it lived in the part that
		 * changes with the token, the first character typed would take it away.
		 */
		'the fold with the token field stays put whatever the token'() {

			const guest = figmol_publish_test_panel()
			$mol_assert_ok( guest.panel.Auth().rows().includes( guest.panel.Manual() ) )
			$mol_assert_ok( !guest.panel.auth_head().includes( guest.panel.Manual() ) )

			const known = figmol_publish_test_panel()
			known.panel.token( 'ghp_secret' )
			$mol_assert_ok( known.panel.Auth().rows().includes( known.panel.Manual() ) )
			$mol_assert_ok( !known.panel.auth_head().includes( known.panel.Manual() ) )
		},

		'the account is named once it is known'() {

			const known = figmol_publish_test_panel()
			known.panel.token( 'ghp_secret' )
			$mol_assert_equal( known.panel.account_label(), known.panel.token_label() )

			const named = figmol_publish_test_panel()
			named.panel.token( 'ghp_secret' )
			named.panel.account( 'alice' )
			$mol_assert_equal( named.panel.account_label(), named.panel.signed_label() + ' alice' )
		},

		'signing in writes a one time value down and carries it to GitHub'() {

			const { panel, kept } = figmol_publish_test_panel()

			panel.login( null )

			$mol_assert_ok( kept.went.startsWith( 'https://github.com/login/oauth/authorize?' ) )

			const args = new URLSearchParams( kept.went.split( '?' )[ 1 ] )

			$mol_assert_equal( args.get( 'client_id' ), $bog_figmol_deploy_github.oauth_client() )
			$mol_assert_equal( args.get( 'redirect_uri' ), figmol_publish_test_page )
			$mol_assert_equal( args.get( 'scope' ), 'repo workflow read:org' )

			// The value in the address is the very one the browser will check the
			// return against.
			$mol_assert_ok( kept.nonce )
			$mol_assert_equal( args.get( 'state' ), kept.nonce )
		},

		'signing out forgets everything the browser was holding'() {

			const { panel } = figmol_publish_test_panel()

			panel.token( 'ghp_secret' )
			panel.account( 'alice' )
			panel.nonce( 'nonce1' )
			panel.owner_wanted( 'acme' )

			panel.logout( null )

			$mol_assert_equal( panel.token(), '' )
			$mol_assert_equal( panel.account(), '' )
			$mol_assert_equal( panel.nonce(), '' )

			// The next account is somebody else's, and so are their organisations.
			$mol_assert_equal( panel.owner_wanted(), '' )
		},

		'the owner is a row of its own, and only for a known account'() {

			const guest = figmol_publish_test_panel()

			$mol_assert_ok( guest.panel.field_rows().includes( guest.panel.Name_field() ) )
			$mol_assert_ok( !guest.panel.field_rows().includes( guest.panel.Owner_field() ) )

			const known = figmol_publish_test_panel()
			known.panel.token( 'ghp_secret' )

			$mol_assert_ok( known.panel.field_rows().includes( known.panel.Owner_field() ) )
		},

		'the select offers the account and the organisations behind it'() {

			const { panel } = figmol_publish_test_panel()

			panel.token( 'ghp_secret' )
			panel.account( 'alice' )
			panel.orgs = ()=> [ 'acme', 'globex' ]

			$mol_assert_like( panel.owner_list(), [ 'alice', 'acme', 'globex' ] )
			$mol_assert_like( panel.owner_options(), { alice: 'alice', acme: 'acme', globex: 'globex' } )

			// The personal account until somebody says otherwise.
			$mol_assert_equal( panel.owner_value(), 'alice' )
		},

		'a picked organisation is remembered and shows up in the address'() {

			const { panel, kept } = figmol_publish_test_panel()

			panel.token( 'ghp_secret' )
			panel.account( 'alice' )
			panel.orgs = ()=> [ 'acme' ]
			panel.name( 'mysite' )

			panel.owner_value( 'acme' )

			$mol_assert_equal( kept.owner, 'acme' )
			$mol_assert_equal( panel.owner_value(), 'acme' )
			$mol_assert_equal( panel.owner_target(), 'acme' )

			$mol_assert_like( panel.name_hint_rows(), [ 'The site will land on https://acme.github.io/mysite/' ] )
		},

		/** Signed in as somebody who is not in that organisation any more. */
		'an organisation the account has lost gives way to the account'() {

			const { panel } = figmol_publish_test_panel()

			panel.owner_wanted( 'acme' )
			panel.token( 'ghp_secret' )
			panel.account( 'bob' )
			panel.orgs = ()=> [ 'globex' ]

			$mol_assert_equal( panel.owner_target(), 'bob' )
			$mol_assert_equal( panel.owner_value(), 'bob' )
		},

		'a name with nowhere to go yet is explained rather than guessed at'() {

			const { panel } = figmol_publish_test_panel()

			panel.token( 'ghp_secret' )
			panel.account( 'alice' )
			panel.name( 'My Site' )

			$mol_assert_like( panel.name_hint_rows(), [ 'One lowercase word' ] )
		},

		'a repository in the way is named in full'() {

			const { panel } = figmol_publish_test_panel()

			panel.owner( 'acme' )
			panel.conflict( 'mysite' )

			$mol_assert_like( panel.conflict_rows(), [ 'acme/mysite already exists' ] )
		},

		/** A code arriving with the wrong value answers a request nobody made here. */
		'a return that does not match is refused before any exchange'() {

			const { panel, kept } = figmol_publish_test_panel()
			panel.nonce( 'nonce1' )

			panel.oauth_land( figmol_publish_test_page + '?code=abc&state=nonce2' )

			$mol_assert_equal( panel.problem(), panel.login_wrong() )
			$mol_assert_equal( panel.token(), '' )
			$mol_assert_equal( kept.nonce, '' )
			$mol_assert_equal( kept.address, figmol_publish_test_page )
		},

		'a refusal on the consent screen leaves no complaint behind'() {

			const { panel, kept } = figmol_publish_test_panel()
			panel.nonce( 'nonce1' )

			panel.oauth_land( figmol_publish_test_page + '?error=access_denied&state=nonce1' )

			$mol_assert_equal( panel.problem(), '' )
			$mol_assert_equal( panel.token(), '' )
			$mol_assert_equal( kept.nonce, '' )
		},

		'any other refusal is shown in the words GitHub used'() {

			const { panel } = figmol_publish_test_panel()
			panel.nonce( 'nonce1' )

			panel.oauth_land(
				figmol_publish_test_page + '?error=redirect_uri_mismatch&error_description=The+redirect_uri+is+not+associated',
			)

			$mol_assert_equal( panel.problem(), 'The redirect_uri is not associated' )
		},

		/** The fragment is the whole state of the editor, and it has to survive. */
		'the address keeps everything but the OAuth keys'() {

			const { panel, kept } = figmol_publish_test_panel()
			panel.nonce( 'nonce1' )

			panel.oauth_land( figmol_publish_test_page + '?code=abc&state=nonce2#!site=xyz/page=1' )

			$mol_assert_equal( kept.address, figmol_publish_test_page + '#!site=xyz/page=1' )
		},

	} )

}
