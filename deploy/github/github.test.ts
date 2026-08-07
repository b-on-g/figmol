namespace $ {

	/**
	 * Contents stay free of `<dollar>name` spellings on purpose — MAM finds
	 * dependencies by scanning sources with a regular expression, string
	 * literals included, and would go looking for a module named after them.
	 */
	const figmol_deploy_test_files = {
		'index.html': '<!doctype html>\n',
		'.github/workflows/deploy.yml': 'name: "mysite"\n',
		'mysite.view.tree': 'mysite mol_view\n',
	}

	$mol_test( {

		'a name is one lowercase word'() {

			const error = ( name: string )=> $bog_figmol_deploy_github.name_error( name )

			$mol_assert_equal( error( 'mysite' ), '' )
			$mol_assert_equal( error( 'site2024' ), '' )

			$mol_assert_ok( error( '' ) )
			$mol_assert_ok( error( 'My Site' ) )
			$mol_assert_ok( error( 'my-site' ) )
			$mol_assert_ok( error( 'my_site' ) )
			$mol_assert_ok( error( '2site' ) )
			$mol_assert_ok( error( 'a'.repeat( 61 ) ) )
		},

		'a name MAM owns is refused'() {
			$mol_assert_ok( $bog_figmol_deploy_github.name_error( 'mol' ) )
			$mol_assert_ok( $bog_figmol_deploy_github.name_error( 'app' ) )
		},

		'a tree carries every file inline, in a stable order'() {

			const body = $bog_figmol_deploy_github.tree_body( figmol_deploy_test_files )

			$mol_assert_like(
				body.tree.map( item => item.path ),
				[ '.github/workflows/deploy.yml', 'index.html', 'mysite.view.tree' ],
			)

			$mol_assert_like( body.tree[ 1 ], {
				path: 'index.html',
				mode: '100644',
				type: 'blob',
				content: '<!doctype html>\n',
			} )
		},

		'a tree without a base replaces the whole repository'() {

			const clean = $bog_figmol_deploy_github.tree_body( figmol_deploy_test_files )
			$mol_assert_equal( ( clean as { base_tree?: string } ).base_tree, undefined )

			const layered = $bog_figmol_deploy_github.tree_body( figmol_deploy_test_files, 'abc123' )
			$mol_assert_equal( ( layered as { base_tree?: string } ).base_tree, 'abc123' )
		},

		'a first commit has no parent, a next one has'() {

			$mol_assert_like(
				$bog_figmol_deploy_github.commit_body( 'Published', 'tree1', [] ),
				{ message: 'Published', tree: 'tree1', parents: [] },
			)

			$mol_assert_like(
				$bog_figmol_deploy_github.commit_body( 'Published', 'tree2', [ 'head1' ] ),
				{ message: 'Published', tree: 'tree2', parents: [ 'head1' ] },
			)
		},

		'a repository is public and starts with a commit'() {

			const body = $bog_figmol_deploy_github.repo_body( 'mysite', 'A site', 'https://alice.github.io/mysite/' )

			$mol_assert_equal( body.name, 'mysite' )
			$mol_assert_equal( body.private, false )
			$mol_assert_equal( body.auto_init, true )
			$mol_assert_equal( body.homepage, 'https://alice.github.io/mysite/' )
		},

		'pages are served from the root of the branch the workflow writes'() {
			$mol_assert_like(
				$bog_figmol_deploy_github.pages_body( 'gh-pages' ),
				{ build_type: 'legacy', source: { branch: 'gh-pages', path: '/' } },
			)
		},

		'a reference names a branch in full'() {
			$mol_assert_like(
				$bog_figmol_deploy_github.ref_body( 'main', 'sha1' ),
				{ ref: 'refs/heads/main', sha: 'sha1' },
			)
		},

		'a run is read as waiting, working, done or failed'() {

			const state = ( run: $bog_figmol_deploy_github_run | null )=> $bog_figmol_deploy_github.run_state( run )

			$mol_assert_equal( state( null ), 'wait' )
			$mol_assert_equal( state( { status: 'queued' } ), 'work' )
			$mol_assert_equal( state( { status: 'in_progress' } ), 'work' )
			$mol_assert_equal( state( { status: 'completed', conclusion: 'success' } ), 'done' )
			$mol_assert_equal( state( { status: 'completed', conclusion: 'failure' } ), 'fail' )
			$mol_assert_equal( state( { status: 'completed', conclusion: 'cancelled' } ), 'fail' )
		},

		'the run of our own commit wins over a newer stranger'() {

			const runs = [
				{ id: 2, head_sha: 'old', status: 'completed', conclusion: 'success' },
				{ id: 1, head_sha: 'new', status: 'queued' },
			]

			$mol_assert_equal( $bog_figmol_deploy_github.run_pick( runs, 'new' )?.id, 1 )
			$mol_assert_equal( $bog_figmol_deploy_github.run_pick( runs, 'none' ), null )
			$mol_assert_equal( $bog_figmol_deploy_github.run_pick( runs, '' )?.id, 2 )
			$mol_assert_equal( $bog_figmol_deploy_github.run_pick( [], 'new' ), null )
		},

		'a site lives in a folder, unless the repository is the account page'() {

			$mol_assert_equal(
				$bog_figmol_deploy_github.site_uri( 'Alice', 'mysite' ),
				'https://alice.github.io/mysite/',
			)

			$mol_assert_equal(
				$bog_figmol_deploy_github.site_uri( 'Alice', 'alice.github.io' ),
				'https://alice.github.io/',
			)

			$mol_assert_equal(
				$bog_figmol_deploy_github.repo_uri( 'Alice', 'mysite' ),
				'https://github.com/Alice/mysite',
			)
		},

		/** An organisation is an owner like any other, domain and all. */
		'a site of an organisation is served from the domain of the organisation'() {

			$mol_assert_equal(
				$bog_figmol_deploy_github.site_uri( 'Acme-Corp', 'mysite' ),
				'https://acme-corp.github.io/mysite/',
			)

			$mol_assert_equal(
				$bog_figmol_deploy_github.site_uri( 'Acme', 'acme.github.io' ),
				'https://acme.github.io/',
			)

			$mol_assert_equal(
				$bog_figmol_deploy_github.repo_uri( 'Acme', 'mysite' ),
				'https://github.com/Acme/mysite',
			)
		},

		'an organisation has an endpoint of its own, the account itself has one path'() {

			const path = ( owner: string, login: string )=> $bog_figmol_deploy_github.repo_path( owner, login )

			$mol_assert_equal( path( '', 'alice' ), '/user/repos' )
			$mol_assert_equal( path( 'alice', 'alice' ), '/user/repos' )

			// GitHub logins differ in spelling and not in case.
			$mol_assert_equal( path( 'Alice', 'alice' ), '/user/repos' )
			$mol_assert_equal( path( ' alice ', 'alice' ), '/user/repos' )

			$mol_assert_equal( path( 'acme', 'alice' ), '/orgs/acme/repos' )
			$mol_assert_equal( path( ' Acme-Corp ', 'alice' ), '/orgs/Acme-Corp/repos' )
		},

		/** Both endpoints take the same fields, so nothing about the body moves. */
		'a repository of an organisation is asked for in the same words'() {

			const body = $bog_figmol_deploy_github.repo_body(
				'mysite',
				'A site',
				'https://acme.github.io/mysite/',
			)

			$mol_assert_like( body, {
				name: 'mysite',
				description: 'A site',
				homepage: 'https://acme.github.io/mysite/',
				private: false,
				has_issues: false,
				has_wiki: false,
				has_projects: false,
				auto_init: true,
			} )
		},

		'organisations are read out of the listing, blanks and repeats dropped'() {

			const pick = ( data: unknown )=> $bog_figmol_deploy_github.orgs_pick( data )

			$mol_assert_like(
				pick( [ { id: 1, login: 'acme' }, { id: 2, login: 'globex' } ] ),
				[ 'acme', 'globex' ],
			)

			$mol_assert_like( pick( [ { login: 'acme' }, { login: 'Acme' }, { login: '' }, {} ] ), [ 'acme' ] )

			// A refusal answers with an object rather than with a list.
			$mol_assert_like( pick( { message: 'Requires authentication' } ), [] )
			$mol_assert_like( pick( null ), [] )
		},

		'the list of owners starts with the account itself'() {

			const list = ( login: string, orgs: readonly string[] )=>
				$bog_figmol_deploy_github.owner_list( login, orgs )

			$mol_assert_like( list( 'alice', [ 'acme', 'globex' ] ), [ 'alice', 'acme', 'globex' ] )
			$mol_assert_like( list( 'alice', [] ), [ 'alice' ] )

			// An account that owns an organisation of its own name is listed once.
			$mol_assert_like( list( 'alice', [ 'Alice', 'acme' ] ), [ 'alice', 'acme' ] )

			// Nothing is known about the account yet — a hand typed token, say.
			$mol_assert_like( list( '', [ 'acme' ] ), [ 'acme' ] )
		},

		'a remembered owner holds while the account still has it'() {

			const pick = ( wanted: string, login: string, orgs: readonly string[] )=>
				$bog_figmol_deploy_github.owner_pick( wanted, login, orgs )

			$mol_assert_equal( pick( '', 'alice', [ 'acme' ] ), 'alice' )
			$mol_assert_equal( pick( 'acme', 'alice', [ 'acme' ] ), 'acme' )
			$mol_assert_equal( pick( 'ACME', 'alice', [ 'acme' ] ), 'acme' )
			$mol_assert_equal( pick( 'alice', 'alice', [ 'acme' ] ), 'alice' )

			// Signed in as somebody who is not in that organisation any more.
			$mol_assert_equal( pick( 'acme', 'bob', [ 'globex' ] ), 'bob' )

			// A token that may not read organisations says nothing about them,
			// and silence is not a reason to publish somewhere else.
			$mol_assert_equal( pick( 'acme', 'alice', [] ), 'acme' )
		},

		'a refusal from an organisation says where it is settled'() {

			const denied = JSON.stringify( {
				message: 'Although you appear to have the correct authorization credentials, '
					+ 'the organization has enabled OAuth App access restrictions',
			} )

			const message = $bog_figmol_deploy_github.repo_fail( 'acme', 'alice', 403, denied )

			// GitHub's own wording comes first, whatever we have to add to it.
			$mol_assert_ok( message.startsWith( 'GitHub 403: Although you appear' ) )
			$mol_assert_ok( message.includes( 'acme may forbid its members to create repositories' ) )
			$mol_assert_ok(
				message.includes( 'https://github.com/organizations/acme/settings/oauth_application_policy' ),
			)

			// A refusal of the account itself has no organisation to blame.
			$mol_assert_equal(
				$bog_figmol_deploy_github.repo_fail( '', 'alice', 403, JSON.stringify( { message: 'Forbidden' } ) ),
				'GitHub 403: Forbidden',
			)

			// Not every refusal is about who may create what.
			$mol_assert_equal(
				$bog_figmol_deploy_github.repo_fail( 'acme', 'alice', 404, JSON.stringify( { message: 'Not Found' } ) ),
				'GitHub 404: Not Found',
			)
		},

		'a refusal keeps the wording GitHub used'() {

			$mol_assert_equal(
				$bog_figmol_deploy_github.fail( 422, JSON.stringify( {
					message: 'Repository creation failed',
					errors: [ { message: 'name already exists on this account' } ],
				} ) ),
				'GitHub 422: Repository creation failed (name already exists on this account)',
			)

			$mol_assert_equal(
				$bog_figmol_deploy_github.fail( 401, JSON.stringify( { message: 'Bad credentials' } ) ),
				'GitHub 401: Bad credentials',
			)

			$mol_assert_equal( $bog_figmol_deploy_github.fail( 502, '<html>oops</html>' ), 'GitHub 502: <html>oops</html>' )
			$mol_assert_equal( $bog_figmol_deploy_github.fail( 500, '' ), 'GitHub 500: request failed' )
		},

		'a token travels in the authorization header and nowhere else'() {

			const client = $bog_figmol_deploy_github.make( { token: ()=> ' ghp_secret ' } )

			$mol_assert_like( client.headers( false ), {
				'accept': 'application/vnd.github+json',
				'x-github-api-version': '2022-11-28',
				'authorization': 'Bearer ghp_secret',
			} )

			$mol_assert_equal( client.headers( true )[ 'content-type' ], 'application/json' )

			const anon = $bog_figmol_deploy_github.make( {} )
			$mol_assert_equal( anon.headers( false )[ 'authorization' ], undefined )
		},

		'the consent screen asks for the scopes a workflow push and an org list need'() {

			const uri = $bog_figmol_deploy_github.oauth_uri( 'Iv1_abc', 'https://figmol.example/back', 'nonce1' )

			$mol_assert_ok( uri.startsWith( 'https://github.com/login/oauth/authorize?' ) )

			const args = new URLSearchParams( uri.split( '?' )[ 1 ] )

			$mol_assert_equal( args.get( 'client_id' ), 'Iv1_abc' )
			$mol_assert_equal( args.get( 'redirect_uri' ), 'https://figmol.example/back' )
			$mol_assert_equal( args.get( 'scope' ), 'repo workflow read:org' )
			$mol_assert_equal( args.get( 'state' ), 'nonce1' )

			// A token made by hand is asked for the same three.
			$mol_assert_ok( $bog_figmol_deploy_github.token_uri().includes( 'scopes=repo,workflow,read:org' ) )
		},

		'the address to come back to is the page alone'() {

			const back = ( href: string )=> $bog_figmol_deploy_github.oauth_back( href )

			$mol_assert_equal( back( 'https://figmol.example/figmol/' ), 'https://figmol.example/figmol/' )

			// The editor keeps its whole state in the fragment, and none of it is
			// any of GitHub's business.
			$mol_assert_equal(
				back( 'https://figmol.example/figmol/#!site=abc/page=1' ),
				'https://figmol.example/figmol/',
			)

			$mol_assert_equal(
				back( 'http://localhost:9080/bog/figmol/app/-/index.html?code=old#!x=1' ),
				'http://localhost:9080/bog/figmol/app/-/index.html',
			)

			$mol_assert_equal( back( 'not an address' ), '' )
		},

		'a return is read out of the query'() {

			const read = ( href: string )=> $bog_figmol_deploy_github.oauth_return( href )

			$mol_assert_like(
				read( 'https://figmol.example/?code=abc123&state=nonce1#!site=xyz' ),
				{ code: 'abc123', state: 'nonce1', error: '', descr: '' },
			)

			$mol_assert_like(
				read( 'https://figmol.example/?error=access_denied&error_description=The+user+said+no' ),
				{ code: '', state: '', error: 'access_denied', descr: 'The user said no' },
			)

			$mol_assert_like(
				read( 'https://figmol.example/#!site=xyz' ),
				{ code: '', state: '', error: '', descr: '' },
			)
		},

		'cleaning the address takes the OAuth keys and nothing else'() {

			const clean = ( href: string )=> $bog_figmol_deploy_github.oauth_clean( href )

			$mol_assert_equal(
				clean( 'https://figmol.example/figmol/?code=abc&state=nonce1#!site=xyz/page=1' ),
				'https://figmol.example/figmol/#!site=xyz/page=1',
			)

			$mol_assert_equal(
				clean( 'https://figmol.example/?error=access_denied&error_description=no&keep=1' ),
				'https://figmol.example/?keep=1',
			)

			$mol_assert_equal(
				clean( 'https://figmol.example/figmol/#!site=xyz' ),
				'https://figmol.example/figmol/#!site=xyz',
			)
		},

		'a one time value is fresh every time'() {

			const first = $bog_figmol_deploy_github.oauth_state()
			const second = $bog_figmol_deploy_github.oauth_state()

			$mol_assert_equal( first.length, 32 )
			$mol_assert_ok( /^[0-9a-f]+$/.test( first ) )
			$mol_assert_ok( first !== second )
		},

		'a return is trusted only when it answers this browser'() {

			const back = ( over: Partial< $bog_figmol_deploy_github_back > = {} )=> ( {
				code: 'abc', state: 'nonce1', error: '', descr: '', ...over,
			} )

			const verdict = ( over: Partial< $bog_figmol_deploy_github_back >, want: string )=>
				$bog_figmol_deploy_github.oauth_verdict( back( over ), want )

			$mol_assert_equal( verdict( {}, 'nonce1' ), 'take' )

			// A code that answers a request this window never made.
			$mol_assert_equal( verdict( {}, 'nonce2' ), 'wrong' )
			$mol_assert_equal( verdict( {}, '' ), 'wrong' )
			$mol_assert_equal( verdict( { state: '' }, 'nonce1' ), 'wrong' )

			$mol_assert_equal( verdict( { code: '', state: '' }, '' ), 'skip' )
			$mol_assert_equal( verdict( { code: '', error: 'access_denied' }, 'nonce1' ), 'skip' )
			$mol_assert_equal( verdict( { code: '', error: 'redirect_uri_mismatch' }, 'nonce1' ), 'error' )
		},

		'a refused exchange is explained in the words the proxy used'() {

			$mol_assert_equal(
				$bog_figmol_deploy_github.oauth_fail( 400, JSON.stringify( {
					error: 'bad_verification_code',
					error_description: 'The code passed is incorrect or expired.',
				} ) ),
				'Sign in failed — The code passed is incorrect or expired.',
			)

			$mol_assert_equal(
				$bog_figmol_deploy_github.oauth_fail( 403, JSON.stringify( { error: 'origin_not_allowed' } ) ),
				'Sign in failed — origin_not_allowed',
			)

			$mol_assert_equal(
				$bog_figmol_deploy_github.oauth_fail( 502, '<html>gateway</html>' ),
				'Sign in failed — the proxy answered 502',
			)
		},

	} )

}
