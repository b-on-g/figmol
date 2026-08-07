namespace $ {

	/** An answer from GitHub, without a network to get it from. */
	const figmol_web_answer = ( code: number, body: unknown )=> {

		const res = new $mol_fetch_response

		res.code = ()=> code
		res.ok = ()=> code >= 200 && code < 300
		res.text = ()=> JSON.stringify( body )
		res.json = ()=> body

		return res
	}

	/**
	 * A GitHub the panel can talk to: every call it makes, answered the way the
	 * real one answers a first publication into an account that has no such
	 * repository yet.
	 *
	 * Only the one method that would open a socket is replaced. Everything above
	 * it — which endpoint each step asks for, what it puts in the body, how it
	 * reads a refusal — is the client the editor ships with.
	 */
	const figmol_web_github = ( owner: string )=> {

		const calls = [] as string[]

		const client = $bog_figmol_deploy_github.make({
			token: ()=> 'ghp_secret',
			message: ()=> 'Published',
		})

		client.response = ( method: string, path: string, body?: unknown )=> {

			calls.push( method + ' ' + path.split( '?' )[ 0 ] )

			if( path === '/user' ) return figmol_web_answer( 200, { login: 'alice' } )
			if( path.startsWith( '/user/orgs' ) ) return figmol_web_answer( 200, [ { id: 1, login: 'acme' } ] )

			// Nothing of that name anywhere yet, so the run makes one.
			if( /^\/repos\/[^/]+\/[^/]+$/.test( path ) ) return figmol_web_answer( 404, { message: 'Not Found' } )

			if( path === '/user/repos' || /^\/orgs\/[^/]+\/repos$/.test( path ) ) {
				return figmol_web_answer( 201, { default_branch: 'main' } )
			}

			// A fresh repository has no branches at all, which is a 409.
			if( /\/git\/ref\/heads\// .test( path ) ) return figmol_web_answer( 409, { message: 'Git Repository is empty' } )
			if( /\/git\/trees$/.test( path ) ) return figmol_web_answer( 201, { sha: 'tree1' } )
			if( /\/git\/commits$/.test( path ) ) return figmol_web_answer( 201, { sha: 'commit1' } )
			if( /\/git\/refs$/.test( path ) ) return figmol_web_answer( 201, {} )

			if( /\/actions\/runs/.test( path ) ) return figmol_web_answer( 200, {
				workflow_runs: [ {
					id: 7,
					head_sha: 'commit1',
					status: 'completed',
					conclusion: 'success',
					html_url: 'https://github.com/' + owner + '/mysite/actions/runs/7',
				} ],
			} )

			if( /\/pages$/.test( path ) ) return figmol_web_answer( 201, {
				html_url: 'https://' + owner + '.github.io/mysite/',
			} )

			return figmol_web_answer( 500, { message: 'unexpected ' + method + ' ' + path } )
		}

		return { client, calls }
	}

	/**
	 * A browser that already holds a token, and forgets it again afterwards.
	 *
	 * The panel keeps the token, the login and the chosen owner in
	 * `$mol_state_local`, and it reaches for that through the client class rather
	 * than through itself — which lands in the real storage of the browser, where
	 * it would outlive the scenario and be found by the next one. Pointed at the
	 * storage of this scenario instead, and reactive as the panel expects: the
	 * select reads the owner back through an atom that has to notice the write.
	 */
	const figmol_web_signed = ( $: $, panel: $.$$.$bog_figmol_deploy_publish, login: string )=> {

		const kept = ( key: string, init: string )=> ( next?: string )=> {
			const val = $.$mol_state_local.value< string >( 'figmol_web_' + key, next )
			return ( val ?? init ) || ''
		}

		panel.token = kept( 'token', 'ghp_secret' )
		panel.account = kept( 'account', login )
		panel.nonce = kept( 'nonce', '' )
		panel.owner_wanted = kept( 'owner', '' )
	}

	$mol_test({

		/**
		 * The whole publication, from the button in the header to a live address:
		 * the token is checked, a repository is made, the generated sources are
		 * pushed, the build is waited for and Pages is switched on — with the log
		 * on screen saying which step is where.
		 */
		'the publishing panel walks every step to a live site'( $ ) {

			const scene = figmol_web_scene( $ )
			const root = scene.build()

			scene.store.node_add( 'text', root, 100, 100, 'Hello' )
			scene.draw()

			const panel = scene.app.Publish() as $.$$.$bog_figmol_deploy_publish
			const github = figmol_web_github( 'alice' )

			figmol_web_signed( $, panel, '' )
			panel.github = ()=> github.client

			figmol_web_click( scene.app.Publish_toggle() )
			scene.draw()

			// The rail belongs to the panel now, and the inspector is out of the way.
			$mol_assert_ok( scene.node.querySelector( '[bog_figmol_deploy_publish]' ) )
			$mol_assert_equal( scene.node.querySelectorAll( '[bog_figmol_app_inspector]' ).length, 0 )

			// Opening the panel suggests a name rather than leaving the field
			// blank, and what is typed over it is what the sources are made for.
			$mol_assert_ok( panel.name() )

			figmol_web_type( panel.Name(), 'mysite' )
			scene.draw()

			$mol_assert_ok( panel.files()[ 'index.html' ] )
			$mol_assert_ok( panel.files()[ 'mysite.view.tree' ] )

			// Every step is waiting, and none of them has been reached.
			$mol_assert_like( panel.steps().map( id => panel.stage( id ) ), [
				'wait', 'wait', 'wait', 'wait', 'wait', 'wait',
			] )

			figmol_web_click( panel.Publish() )
			scene.draw()

			$mol_assert_equal( panel.problem(), '' )
			$mol_assert_like( panel.steps().map( id => panel.stage( id ) ), [
				'done', 'done', 'done', 'done', 'done', 'done',
			] )

			$mol_assert_equal( panel.site(), 'https://alice.github.io/mysite/' )
			$mol_assert_equal( panel.busy(), false )

			// A personal account is asked for its own endpoint.
			$mol_assert_ok( github.calls.includes( 'POST /user/repos' ) )
			$mol_assert_ok( github.calls.includes( 'POST /repos/alice/mysite/git/trees' ) )
			$mol_assert_ok( github.calls.includes( 'POST /repos/alice/mysite/pages' ) )

			// And the log on screen says so, with the address to open.
			const log = scene.node.querySelector( '[bog_figmol_deploy_publish]' ) as HTMLElement
			$mol_assert_equal( panel.step_mark( 'live' ), '✓' )
			$mol_assert_ok( log.textContent!.includes( panel.step_title_live() ) )
			$mol_assert_ok( log.textContent!.includes( 'https://alice.github.io/mysite/' ) )

			scene.done()
		},

		/**
		 * An organisation is an owner like any other: a different endpoint to
		 * create the repository in, a domain of its own for the result, and the
		 * same body either way.
		 */
		'a repository asked for an organisation goes to the endpoint of that organisation'( $ ) {

			const scene = figmol_web_scene( $ )
			scene.build()

			const panel = scene.app.Publish() as $.$$.$bog_figmol_deploy_publish
			const github = figmol_web_github( 'acme' )

			figmol_web_signed( $, panel, 'alice' )
			panel.github = ()=> github.client

			figmol_web_click( scene.app.Publish_toggle() )
			scene.draw()

			figmol_web_type( panel.Name(), 'mysite' )
			scene.draw()

			// The select offers the account first and the organisations behind it.
			$mol_assert_like( panel.owner_list(), [ 'alice', 'acme' ] )
			$mol_assert_equal( panel.owner_value(), 'alice' )

			panel.owner_value( 'acme' )
			scene.draw()

			// The hint under the name spells the address out rather than the rule.
			$mol_assert_like( panel.name_hint_rows(), [
				panel.site_hint() + ' https://acme.github.io/mysite/',
			] )

			figmol_web_click( panel.Publish() )
			scene.draw()

			$mol_assert_equal( panel.problem(), '' )
			$mol_assert_equal( panel.owner(), 'acme' )
			$mol_assert_equal( panel.site(), 'https://acme.github.io/mysite/' )

			$mol_assert_ok( github.calls.includes( 'POST /orgs/acme/repos' ) )
			$mol_assert_equal( github.calls.includes( 'POST /user/repos' ), false )

			// The account it publishes as is still the one the token belongs to.
			$mol_assert_equal( panel.note( 'login' ), 'alice → acme' )

			scene.done()
		},

	})

}
