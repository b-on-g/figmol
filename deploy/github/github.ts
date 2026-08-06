namespace $ {

	/** Repository name rules, shared by the validator and the generator. */
	const figmol_deploy_name = /^[a-z][a-z0-9]*$/

	/** Occupied by MAM itself, so a generated project may not be named like this. */
	const figmol_deploy_reserved = [
		'mol', 'hyoo', 'bog', 'giper', 'node', 'mam', 'my', 'app', 'web', 'test', 'exam',
	]

	/**
	 * Public half of the OAuth App the published editor signs in through.
	 *
	 * A client id is meant to be read by anybody — it travels in the address of
	 * the consent screen. The secret half never leaves the proxy below.
	 */
	const figmol_deploy_client = 'Ov23liiOSDbpdHqaotYF'

	/** The one service of ours in the whole picture: it trades a code for a token. */
	const figmol_deploy_proxy = 'https://figmol-oauth.91-188-212-151.ip.giper.dev'

	/** What the consent screen adds to the address, and what is taken back out. */
	const figmol_deploy_oauth_keys = [ 'code', 'state', 'error', 'error_description', 'error_uri' ]

	/** A workflow run, cut down to what publishing needs to know. */
	export type $bog_figmol_deploy_github_run = {
		readonly id?: number
		readonly name?: string
		/** `queued` | `in_progress` | `completed` */
		readonly status?: string
		/** `success` | `failure` | `cancelled` | … — only meaningful once completed. */
		readonly conclusion?: string | null
		readonly html_url?: string
		readonly head_sha?: string
	}

	/** Repository fields the publisher reads back. */
	export type $bog_figmol_deploy_github_repo = {
		readonly full_name?: string
		readonly html_url?: string
		readonly default_branch?: string
	}

	/** How far along a step of the pipeline is. */
	export type $bog_figmol_deploy_github_state = 'wait' | 'work' | 'done' | 'fail'

	/** A return from the consent screen, as it arrives in the address. */
	export type $bog_figmol_deploy_github_back = {
		readonly code: string
		readonly state: string
		readonly error: string
		readonly descr: string
	}

	/**
	 * What to make of such a return.
	 *
	 * `take` — trade the code; `skip` — nothing happened, or the user said no;
	 * `wrong` — it does not answer a request this browser made; `error` — GitHub
	 * refused and explained itself.
	 */
	export type $bog_figmol_deploy_github_verdict = 'take' | 'skip' | 'wrong' | 'error'

	/**
	 * The slice of the GitHub REST API that publishing a generated site needs.
	 *
	 * Request bodies are built by static pure methods and sent by instance
	 * actions, so the shape of every call can be checked in a test while the
	 * network part stays a thin wrapper over `$mol_fetch`.
	 *
	 * The token lives in the browser and is sent to `api.github.com` only — no
	 * backend of ours ever sees it.
	 */
	export class $bog_figmol_deploy_github extends $mol_object {

		/* --------------------------------------------------------- configuration */

		api() {
			return 'https://api.github.com'
		}

		/** Bearer token. Empty means the calls go out anonymous and get refused. */
		token() {
			return ''
		}

		message() {
			return 'Published from Figmol'
		}

		/** Branch the deploy workflow pushes the built bundle to. */
		branch_pages() {
			return 'gh-pages'
		}

		/** Fallback for a repository whose default branch is unknown. */
		branch_main() {
			return 'main'
		}

		/* ------------------------------------------------------------- persistence */

		/**
		 * Token remembered between visits.
		 *
		 * It is a secret, and `localStorage` is not a vault — but the alternative
		 * is retyping a forty character string on every publication, and the token
		 * is scoped to repositories the user created for this very purpose.
		 */
		static token_saved( next?: string ): string {
			return this.$.$mol_state_local.value< string >( 'bog_figmol_deploy_token', next ) ?? ''
		}

		/**
		 * Login of the account the saved token belongs to.
		 *
		 * Kept beside the token so the panel can say whom it is signed in as
		 * without asking GitHub on every render — the answer only changes when
		 * the token does.
		 */
		static login_saved( next?: string ): string {
			return this.$.$mol_state_local.value< string >( 'bog_figmol_deploy_login', next ) ?? ''
		}

		/**
		 * The pending one time value of a sign in, kept across the redirect.
		 *
		 * The whole point is that it survives leaving the page and coming back:
		 * a return carrying somebody else's `state` is not an answer to a request
		 * this browser made.
		 */
		static state_saved( next?: string ): string {
			return this.$.$mol_state_local.value< string >( 'bog_figmol_deploy_state', next ) ?? ''
		}

		/* ------------------------------------------------------------- pure helpers */

		/** Empty when the name is usable, a sentence explaining the refusal otherwise. */
		static name_error( name: string ) {
			if( !name ) return 'Enter a name for the repository'
			if( name.length > 60 ) return 'Sixty characters at most'
			if( !figmol_deploy_name.test( name ) ) return 'One lowercase word: latin letters and digits, starting with a letter'
			if( figmol_deploy_reserved.includes( name ) ) return 'This name is taken by MAM itself — pick another one'
			return ''
		}

		/** GitHub explains itself well, so its own wording is what the user sees. */
		static fail( code: number, body: string ) {

			let message = ''

			try {

				const data = JSON.parse( body ) as { message?: string, errors?: readonly any[] }
				message = String( data?.message ?? '' )

				const extra = ( data?.errors ?? [] )
					.map( item => String( item?.message ?? item?.code ?? '' ) )
					.filter( Boolean )
					.join( '; ' )

				if( extra ) message += ' (' + extra + ')'

			} catch {
				message = body.slice( 0, 200 )
			}

			return 'GitHub ' + code + ': ' + ( message.trim() || 'request failed' )
		}

		static repo_body( name: string, descr = '', homepage = '' ) {
			return {
				name,
				description: descr,
				homepage,
				private: false,
				has_issues: false,
				has_wiki: false,
				has_projects: false,
				/**
				 * An empty repository has no branch to commit onto, and the API for
				 * making the first one differs from the API for moving an existing
				 * one. One initial commit spares the pipeline that fork.
				 */
				auto_init: true,
			}
		}

		/**
		 * The whole file map as one tree.
		 *
		 * Without a `base_tree` the commit contains exactly these files and nothing
		 * else, so republishing a site never leaves an orphan behind — including
		 * the `README.md` that `auto_init` writes.
		 */
		static tree_body( files: Readonly< Record< string, string > >, base = '' ) {

			const tree = Object.keys( files ).sort().map( path => ( {
				path,
				mode: '100644',
				type: 'blob',
				content: files[ path ],
			} ) )

			return base ? { base_tree: base, tree } : { tree }
		}

		static commit_body( message: string, tree: string, parents: readonly string[] ) {
			return { message, tree, parents }
		}

		static ref_body( branch: string, sha: string ) {
			return { ref: 'refs/heads/' + branch, sha }
		}

		static pages_body( branch: string ) {
			return {
				build_type: 'legacy',
				source: { branch, path: '/' },
			}
		}

		static run_state( run: $bog_figmol_deploy_github_run | null ): $bog_figmol_deploy_github_state {
			if( !run ) return 'wait'
			if( run.status !== 'completed' ) return 'work'
			return run.conclusion === 'success' ? 'done' : 'fail'
		}

		/**
		 * The run of our own commit, if GitHub has registered it yet.
		 *
		 * Matching by commit matters on a republish: the previous run is still
		 * listed first for a few seconds and would be reported as the result.
		 */
		static run_pick( runs: readonly $bog_figmol_deploy_github_run[], sha: string ) {
			if( !sha ) return runs[ 0 ] ?? null
			return runs.find( run => run.head_sha === sha ) ?? null
		}

		static repo_uri( owner: string, name: string ) {
			return 'https://github.com/' + owner + '/' + name
		}

		/** A repository named after the account itself is served from the domain root. */
		static site_uri( owner: string, name: string ) {
			const root = owner.toLowerCase() + '.github.io'
			return name.toLowerCase() === root ? 'https://' + root + '/' : 'https://' + root + '/' + name + '/'
		}

		/** Prefilled form for a classic token with exactly the scopes we use. */
		static token_uri() {
			return 'https://github.com/settings/tokens/new?scopes=repo,workflow&description=Figmol'
		}

		/**
		 * Where the browser goes to ask the user for access.
		 *
		 * `workflow` is on the list because the pushed files include
		 * `.github/workflows/deploy.yml`, which GitHub refuses to accept from a
		 * token that only has `repo`.
		 */
		static oauth_uri( client_id: string, redirect: string, state: string ) {

			const args = new URLSearchParams( {
				client_id,
				redirect_uri: redirect,
				scope: 'repo workflow',
				state,
			} )

			return 'https://github.com/login/oauth/authorize?' + args.toString()
		}

		static oauth_client() {
			return figmol_deploy_client
		}

		static oauth_proxy() {
			return figmol_deploy_proxy
		}

		/**
		 * A fresh one time value for a sign in.
		 *
		 * From the same source as any other secret in the browser rather than
		 * from `Math.random`: a guessable `state` is a way to talk a signed in
		 * user into finishing somebody else's sign in.
		 */
		static oauth_state() {
			return Array.from(
				$mol_crypto2_nonce(),
				byte => byte.toString( 16 ).padStart( 2, '0' ),
			).join( '' )
		}

		/**
		 * The page itself, without the query and the fragment.
		 *
		 * This is both what the OAuth App is registered for and what the token
		 * exchange is checked against, so the two have to be spelled the same way
		 * on the way there and on the way back.
		 */
		static oauth_back( href: string ) {
			try {
				const uri = new URL( href )
				return uri.origin + uri.pathname
			} catch {
				return ''
			}
		}

		/** What the consent screen left in the address. */
		static oauth_return( href: string ): $bog_figmol_deploy_github_back {

			let args = new URLSearchParams()

			try {
				args = new URL( href ).searchParams
			} catch {}

			return {
				code: args.get( 'code' ) ?? '',
				state: args.get( 'state' ) ?? '',
				error: args.get( 'error' ) ?? '',
				descr: args.get( 'error_description' ) ?? '',
			}
		}

		/**
		 * The same address with the OAuth keys taken out.
		 *
		 * Everything else survives — the fragment above all, since the editor
		 * keeps its whole state there and `$mol_state_arg` copies whatever the
		 * address holds into every link it builds.
		 */
		static oauth_clean( href: string ) {

			try {

				const uri = new URL( href )
				for( const key of figmol_deploy_oauth_keys ) uri.searchParams.delete( key )

				const query = uri.searchParams.toString()

				return uri.origin + uri.pathname + ( query ? '?' + query : '' ) + uri.hash

			} catch {
				return href
			}
		}

		/** Whether such a return is worth a token exchange, and why not otherwise. */
		static oauth_verdict(
			back: $bog_figmol_deploy_github_back,
			want: string,
		): $bog_figmol_deploy_github_verdict {

			// A refusal on the consent screen is an answer, not a failure.
			if( back.error === 'access_denied' ) return 'skip'
			if( back.error ) return 'error'
			if( !back.code ) return 'skip'

			return want && back.state === want ? 'take' : 'wrong'
		}

		/** The proxy answers in OAuth's own shape, not in GitHub's. */
		static oauth_fail( code: number, body: string ) {

			try {
				const data = JSON.parse( body ) as { error?: string, error_description?: string }
				const message = String( data?.error_description || data?.error || '' )
				if( message ) return 'Sign in failed — ' + message
			} catch {}

			return 'Sign in failed — the proxy answered ' + code
		}

		/* ------------------------------------------------------------- transport */

		headers( body: boolean ) {

			const res: Record< string, string > = {
				'accept': 'application/vnd.github+json',
				'x-github-api-version': '2022-11-28',
			}

			const token = this.token().trim()
			if( token ) res[ 'authorization' ] = 'Bearer ' + token
			if( body ) res[ 'content-type' ] = 'application/json'

			return res
		}

		@ $mol_action
		response( method: string, path: string, body?: unknown ) {
			return this.$.$mol_fetch.response( this.api() + path, {
				method,
				headers: this.headers( body !== undefined ),
				body: body === undefined ? undefined : JSON.stringify( body ),
			} )
		}

		/** Any success as JSON, anything else as an error carrying GitHub's message. */
		@ $mol_action
		json( method: string, path: string, body?: unknown ) {
			const res = this.response( method, path, body )
			if( !res.ok() ) throw new Error( $bog_figmol_deploy_github.fail( res.code(), res.text() ) )
			return res.json() as any
		}

		/* ------------------------------------------------------------- operations */

		@ $mol_action
		user() {
			return this.json( 'GET', '/user' ) as { login: string, name?: string, avatar_url?: string }
		}

		/** The repository, or null when the account has no such name yet. */
		@ $mol_action
		repo( owner: string, name: string ) {

			const res = this.response( 'GET', '/repos/' + owner + '/' + name )

			if( res.code() === 404 ) return null
			if( !res.ok() ) throw new Error( $bog_figmol_deploy_github.fail( res.code(), res.text() ) )

			return res.json() as $bog_figmol_deploy_github_repo
		}

		@ $mol_action
		repo_make( name: string, descr = '', homepage = '' ) {
			const body = $bog_figmol_deploy_github.repo_body( name, descr, homepage )
			return this.json( 'POST', '/user/repos', body ) as $bog_figmol_deploy_github_repo
		}

		/** Head commit of a branch, empty when there is no branch to speak of. */
		@ $mol_action
		head( owner: string, name: string, branch: string ) {

			const res = this.response( 'GET', '/repos/' + owner + '/' + name + '/git/ref/heads/' + branch )

			// 409 is what an empty repository answers — no branches at all yet.
			if( res.code() === 404 || res.code() === 409 ) return ''
			if( !res.ok() ) throw new Error( $bog_figmol_deploy_github.fail( res.code(), res.text() ) )

			return String( ( res.json() as any )?.object?.sha ?? '' )
		}

		/**
		 * The whole file map as a single commit on `branch`. Returns its sha.
		 *
		 * Four calls — tree, commit, ref — instead of one per file: the Trees API
		 * takes file contents inline, so a blob upload per file is not needed.
		 */
		@ $mol_action
		push( owner: string, name: string, files: Readonly< Record< string, string > >, branch: string ) {

			const klass = $bog_figmol_deploy_github
			const repo = '/repos/' + owner + '/' + name

			const base = this.head( owner, name, branch )

			const tree = String( this.json( 'POST', repo + '/git/trees', klass.tree_body( files ) )?.sha ?? '' )

			const commit = String( this.json(
				'POST',
				repo + '/git/commits',
				klass.commit_body( this.message(), tree, base ? [ base ] : [] ),
			)?.sha ?? '' )

			if( base ) this.json( 'PATCH', repo + '/git/refs/heads/' + branch, { sha: commit, force: true } )
			else this.json( 'POST', repo + '/git/refs', klass.ref_body( branch, commit ) )

			return commit
		}

		/**
		 * Turns Pages on for the `gh-pages` branch. Empty result means «not yet».
		 *
		 * The branch appears only after the first workflow run finishes, and until
		 * then GitHub refuses the source — hence a caller that keeps trying rather
		 * than an error.
		 */
		@ $mol_action
		pages( owner: string, name: string ) {

			const klass = $bog_figmol_deploy_github
			const body = klass.pages_body( this.branch_pages() )
			const path = '/repos/' + owner + '/' + name + '/pages'

			const made = this.response( 'POST', path, body )
			if( made.ok() ) return String( ( made.json() as any )?.html_url ?? klass.site_uri( owner, name ) )

			// Already on: only the source may need moving to our branch.
			if( made.code() === 409 ) {
				const moved = this.response( 'PUT', path, body )
				if( moved.ok() ) return klass.site_uri( owner, name )
				throw new Error( klass.fail( moved.code(), moved.text() ) )
			}

			if( made.code() === 404 || made.code() === 422 ) return ''

			throw new Error( klass.fail( made.code(), made.text() ) )
		}

		@ $mol_action
		runs( owner: string, name: string ) {
			const data = this.json( 'GET', '/repos/' + owner + '/' + name + '/actions/runs?per_page=10' )
			return ( data?.workflow_runs ?? [] ) as readonly $bog_figmol_deploy_github_run[]
		}

		/**
		 * Trades an OAuth code for a token through our own proxy.
		 *
		 * The exchange needs the client secret, which is why it cannot happen in
		 * the browser; the proxy holds the secret and stores nothing.
		 *
		 * `redirect` repeats what the consent screen was asked for — GitHub
		 * refuses an exchange whose redirect differs from the one that earned the
		 * code, and the proxy checks it against its own allowlist besides.
		 *
		 * An action rather than a plain method, and that is the point: a code is
		 * good for one exchange, and a caller whose fiber restarts replays the
		 * cached answer instead of spending the code twice.
		 */
		@ $mol_action
		oauth_token( proxy: string, code: string, redirect = '' ) {

			const res = this.$.$mol_fetch.response( proxy.replace( /\/+$/, '' ) + '/exchange', {
				method: 'POST',
				headers: { 'accept': 'application/json', 'content-type': 'application/json' },
				body: JSON.stringify( redirect ? { code, redirect_uri: redirect } : { code } ),
			} )

			if( !res.ok() ) throw new Error( $bog_figmol_deploy_github.oauth_fail( res.code(), res.text() ) )

			return String( ( res.json() as any )?.access_token ?? '' )
		}

	}

}
