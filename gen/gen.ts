namespace $ {

	/**
	 * A dollar sign is glued to generated identifiers at runtime on purpose.
	 *
	 * MAM discovers dependencies by scanning sources for `<dollar>name` with a
	 * regular expression, string literals included. Spelling the identifiers of
	 * a generated project out in full would drag `mol/paragraph`, `mol/link` and
	 * a non existent module named after the user project into the bundle of the
	 * editor itself.
	 */
	const figmol_gen_sign = ( name: string )=> '$' + name

	/** Occupied by MAM itself, so a project may not be named like this. */
	const figmol_gen_reserved = [
		'mol', 'hyoo', 'bog', 'giper', 'node', 'mam', 'my', 'app', 'web', 'test', 'exam',
	]

	/** Lowercase word usable both as a directory name and as a class name part. */
	const figmol_gen_ident = ( raw: unknown, fallback: string )=> {
		const id = String( raw ?? '' ).toLowerCase().replace( /[^a-z0-9]+/g, '' ).replace( /^[0-9]+/, '' )
		return id || fallback
	}

	/** One line of a `\`-literal: everything up to the line break belongs to it. */
	const figmol_gen_line = ( raw: unknown )=> String( raw ?? '' ).replace( /[\r\n\t]+/g, ' ' )

	const figmol_gen_quote = ( raw: string )=> "'" + raw
		.replace( /\\/g, '\\\\' )
		.replace( /'/g, "\\'" )
		.replace( /\r/g, '\\r' )
		.replace( /\n/g, '\\n' )
		.replace( /\u2028/g, '\\u2028' )
		.replace( /\u2029/g, '\\u2029' )
		+ "'"

	const figmol_gen_key = ( raw: string )=> /^[A-Za-z_][A-Za-z0-9_]*$/.test( raw ) ? raw : figmol_gen_quote( raw )

	const figmol_gen_html = ( raw: unknown )=> String( raw ?? '' )
		.replace( /&/g, '&amp;' )
		.replace( /</g, '&lt;' )
		.replace( />/g, '&gt;' )
		.replace( /"/g, '&quot;' )
		.replace( /'/g, '&#39;' )

	/** Double quoted YAML scalar — the only form that never needs indentation rules. */
	const figmol_gen_yaml = ( raw: unknown )=> '"' + String( raw ?? '' )
		.replace( /\\/g, '\\\\' )
		.replace( /"/g, '\\"' )
		.replace( /[\r\n\t]+/g, ' ' )
		+ '"'

	const figmol_gen_color = ( raw: unknown )=> {
		const val = String( raw ?? '' ).trim()
		return /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test( val ) ? val : null
	}

	const figmol_gen_length = ( raw: unknown )=> {
		const val = String( raw ?? '' ).trim()
		if( /^-?\d+(\.\d+)?$/.test( val ) ) return val + 'px'
		return /^-?\d+(\.\d+)?(px|rem|em|%|vh|vw)$/.test( val ) ? val : null
	}

	const figmol_gen_weight = ( raw: unknown )=> {
		const val = String( raw ?? '' ).trim()
		if( /^[1-9]00$/.test( val ) ) return Number( val )
		return [ 'normal', 'bold', 'lighter', 'bolder' ].includes( val ) ? val : null
	}

	const figmol_gen_text_align = ( raw: unknown )=> {
		const val = String( raw ?? '' ).trim()
		return [ 'left', 'right', 'center', 'justify' ].includes( val ) ? val : null
	}

	/** Font stacks are pasted into a string literal, so keep them boring. */
	const figmol_gen_family = ( raw: unknown )=> {
		const val = String( raw ?? '' ).trim()
		return /^[- A-Za-z0-9_,'"]{1,120}$/.test( val ) ? val : null
	}

	const figmol_gen_uri = ( raw: unknown )=> {
		const val = figmol_gen_line( raw ).trim()
		if( !val ) return ''
		return /^(https?:|mailto:|tel:|[.\/#?])/i.test( val ) ? val : ''
	}

	const figmol_gen_round = ( raw: unknown, fallback: number )=> {
		const val = Number( raw )
		return Number.isFinite( val ) ? Math.round( val ) : fallback
	}

	/** Looks a library block understands. Anything else falls back to the plain one. */
	const figmol_gen_variants = [ 'default', 'secondary', 'outline', 'ghost', 'destructive' ]

	const figmol_gen_variant = ( raw: unknown )=> {
		const val = figmol_gen_line( raw ).trim()
		return figmol_gen_variants.includes( val ) ? val : 'default'
	}

	/**
	 * Captions of a tabs block into the key-title pairs a switch is declared with.
	 *
	 * Keys are made out of the captions and have to stay unique — two tabs named
	 * the same would otherwise collapse into one.
	 */
	const figmol_gen_options = ( raw: unknown )=> {

		const res = [] as [ string, string ][]
		const taken = new Set< string >()

		figmol_gen_line( raw ).split( '|' ).forEach( ( part, index )=> {

			const title = part.trim()
			if( !title ) return

			const base = figmol_gen_ident( title, 'tab' + ( index + 1 ) )
			let key = base
			for( let n = 2; taken.has( key ); ++n ) key = base + n
			taken.add( key )

			res.push([ key, title ])
		} )

		return res as readonly ( readonly [ string, string ] )[]
	}

	/**
	 * Layers one style over another, merging groups instead of replacing them.
	 *
	 * A frame is both a flex item and a flex container, so its placement
	 * contributes `flex.shrink` while its own layout contributes
	 * `flex.direction` — a plain assign would drop one of the two.
	 */
	const figmol_gen_assign = ( target: Record< string, unknown >, patch: Record< string, unknown > )=> {

		for( const key of Object.keys( patch ) ) {

			const prev = target[ key ] as Record< string, unknown > | undefined
			const next = patch[ key ] as Record< string, unknown >

			target[ key ] = prev?.constructor === Object && next?.constructor === Object
				? { ... prev, ... next }
				: next
		}

		return target
	}

	const figmol_gen_items: Readonly< Record< string, string > > = {
		start: 'flex-start',
		center: 'center',
		end: 'flex-end',
		stretch: 'stretch',
	}

	/** Plain snapshot of one canvas element — no Baza objects involved. */
	export type $bog_figmol_gen_node = {
		readonly kind?: string
		readonly props?: Readonly< Record< string, string > >
		readonly x?: number
		readonly y?: number
		readonly w?: number
		readonly h?: number
		/** `row` | `column`. Anything else means free placement of children. */
		readonly direction?: string
		readonly gap?: number
		readonly padding?: number
		/** `start` | `center` | `end` | `stretch` */
		readonly align?: string
		/** Component an `inst` node draws, by the id it has in `comps`. */
		readonly master?: string
		readonly kids?: readonly $bog_figmol_gen_node[]
	}

	/** A component of the site: a name and the subtree its instances draw. */
	export type $bog_figmol_gen_comp = {
		readonly id?: string
		readonly title?: string
		readonly root?: $bog_figmol_gen_node | null
	}

	export type $bog_figmol_gen_page = {
		readonly title?: string
		readonly slug?: string
		readonly root?: $bog_figmol_gen_node | null
	}

	export type $bog_figmol_gen_site = {
		readonly title?: string
		readonly theme?: Readonly< Record< string, string > >
		readonly comps?: readonly $bog_figmol_gen_comp[]
		readonly pages?: readonly $bog_figmol_gen_page[]
	}

	export type $bog_figmol_gen_options = {
		/** Repository and module name, `mysite` by default. */
		readonly name?: string
		/** `owner/repo`, used for the links inside the readme. */
		readonly repo?: string
	}

	/** One node of a page after naming, typing and styling are resolved. */
	export type $bog_figmol_gen_unit = {
		readonly name: string
		readonly kind: string
		readonly comp: string
		readonly title: string
		/** Second line of an alert block. */
		readonly note: string
		/** Look of a block that has several. */
		readonly variant: string
		readonly uri: string
		readonly value: number
		readonly max: number
		/** Key and caption of every tab, for a tabs block. */
		readonly options: readonly ( readonly [ string, string ] )[]
		readonly style: Record< string, unknown >
		readonly kids: readonly $bog_figmol_gen_unit[]
	}

	export type $bog_figmol_gen_screen = {
		readonly id: string
		readonly title: string
		readonly comp: string
		readonly prop: string
		readonly nav: string
		readonly units: readonly $bog_figmol_gen_unit[]
		readonly style: Record< string, unknown >
	}

	/** A component after naming: a class of its own, used wherever it is placed. */
	export type $bog_figmol_gen_part = {
		readonly id: string
		readonly title: string
		readonly comp: string
		/** Component the master is built out of — the class extends that one. */
		readonly base: string
		/** The master itself, for the properties it carries. */
		readonly head: $bog_figmol_gen_unit
		readonly units: readonly $bog_figmol_gen_unit[]
		readonly style: Record< string, unknown >
	}

	/**
	 * What every node being named needs to know: the counter its name comes off,
	 * the accent colour of the site, and which class every component became.
	 */
	export type $bog_figmol_gen_ctx = {
		count: number
		readonly accent: string
		readonly comps: Readonly< Record< string, string > >
	}

	export type $bog_figmol_gen_plan = {
		readonly name: string
		readonly title: string
		readonly root: string
		/** Attributes the root carries: the palette and the family of the library. */
		readonly attrs: Readonly< Record< string, string > >
		readonly parts: readonly $bog_figmol_gen_part[]
		readonly screens: readonly $bog_figmol_gen_screen[]
		readonly style: Record< string, unknown >
	}

	/**
	 * Turns a site snapshot into the source of a standalone MAM repository.
	 *
	 * Every method is static and pure: the input is plain JSON, the output is a
	 * map of file path to file content. Nothing here touches the Baza, which is
	 * what makes the whole generator testable without a Land.
	 */
	export class $bog_figmol_gen {

		/** Full repository, keyed by path relative to its root. */
		static files( site: $bog_figmol_gen_site, options: $bog_figmol_gen_options = {} ) {

			const plan = this.plan( site, options )

			const files: Record< string, string > = {}

			files[ plan.name + '.view.tree' ] = this.view_tree( plan )

			const script = this.view_ts( plan )
			if( script ) files[ plan.name + '.view.ts' ] = script

			files[ plan.name + '.view.css.ts' ] = this.view_css( plan )
			files[ 'index.html' ] = this.index_html( plan )
			files[ 'readme.md' ] = this.readme( plan, options )
			files[ '.github/workflows/deploy.yml' ] = this.workflow( plan )
			files[ '.gitignore' ] = '-*\n.DS_Store\n'
			files[ '.gitattributes' ] = '*\t-text\n'

			return files
		}

		/* ------------------------------------------------------------- planning */

		static plan( site: $bog_figmol_gen_site, options: $bog_figmol_gen_options = {} ): $bog_figmol_gen_plan {

			const title = figmol_gen_line( site.title ?? '' ).trim() || 'My Site'

			let name = figmol_gen_ident( options.name ?? title, 'mysite' )
			if( figmol_gen_reserved.includes( name ) ) name += 'site'

			const root = figmol_gen_sign( name )
			const theme = site.theme ?? {}
			const accent = $bog_figmol_theme.value( theme, 'accent' )

			// Components are named before anything is walked: a page may place one,
			// and so may another component, so every reference needs an answer
			// before the first subtree is turned into units.
			const comps = site.comps ?? []
			const names = {} as Record< string, string >
			const claimed = new Set< string >()

			const slugs = comps.map( ( comp, index )=> {

				const raw = figmol_gen_line( comp.title ?? '' ).trim()

				let slug = figmol_gen_ident( raw, 'comp' + ( index + 1 ) )
				if( claimed.has( slug ) ) slug = slug + ( index + 1 )
				claimed.add( slug )

				if( comp.id ) names[ comp.id ] = root + '_c_' + slug

				return slug
			} )

			const parts = comps.map( ( comp, index )=> this.part( comp, {
				id: comp.id ?? '',
				title: figmol_gen_line( comp.title ?? '' ).trim() || 'Component ' + ( index + 1 ),
				comp: root + '_c_' + slugs[ index ],
				accent,
				comps: names,
			} ) )

			const pages = site.pages?.length ? site.pages : [ {} as $bog_figmol_gen_page ]

			const taken = new Set< string >()

			const screens = pages.map( ( page, index )=> {

				const page_title = figmol_gen_line( page.title ?? '' ).trim() || 'Page ' + ( index + 1 )

				let id = figmol_gen_ident( page.slug ?? '', index ? '' : 'home' ) || figmol_gen_ident( page_title, 'page' )
				if( taken.has( id ) ) id = id + ( index + 1 )
				taken.add( id )

				return this.screen( page, { id, title: page_title, root, accent, comps: names } )
			} )

			return {
				name,
				title,
				root,
				attrs: this.attrs( site ),
				parts,
				screens,
				style: this.style_root( site, screens ),
			}
		}

		/**
		 * Attributes of the root: the palette the library blocks paint themselves
		 * with, and the family everything is set in. The very ones the editor put
		 * on its sheet — a canvas and a site that disagree here would be a canvas
		 * nobody could trust.
		 */
		static attrs( site: $bog_figmol_gen_site ): Readonly< Record< string, string > > {

			const theme = site.theme ?? {}
			const font = $bog_figmol_theme.font_attr( $bog_figmol_theme.value( theme, 'font' ) )

			return {
				bog_builderui_base: $bog_figmol_theme.value( theme, 'base' ),
				bog_builderui_lights: $bog_figmol_theme.value( theme, 'lights' ),
				bog_builderui_font_body: font,
				bog_builderui_font_head: font,
			}
		}

		static screen(
			page: $bog_figmol_gen_page,
			about: {
				id: string,
				title: string,
				root: string,
				accent: string,
				comps: Readonly< Record< string, string > >,
			},
		): $bog_figmol_gen_screen {

			const frame = page.root ?? null
			const flow = this.flow( frame )

			const ctx = { count: 0, accent: about.accent, comps: about.comps }
			const units = ( frame?.kids ?? [] ).map( kid => this.unit( kid, flow, ctx, frame ?? undefined ) )

			const style: Record< string, unknown > = {}

			if( flow ) {
				figmol_gen_assign( style, this.style_flow( frame! ) )
			} else {
				style.position = 'relative'
				const bottom = ( frame?.kids ?? [] ).reduce(
					( max, kid )=> Math.max( max, figmol_gen_round( kid.y, 0 ) + figmol_gen_round( kid.h, 0 ) ),
					0,
				)
				if( bottom > 0 ) style.minHeight = ( bottom + 40 ) + 'px'
			}

			/** The page fills the shell, so it grows whatever its own flow is. */
			const flex = ( style.flex ?? {} ) as { direction?: string }
			style.flex = { grow: 1, direction: flex.direction ?? 'column' }

			this.spread( style, units )

			return {
				id: about.id,
				title: about.title,
				comp: about.root + '_page_' + about.id,
				prop: 'Page_' + about.id,
				nav: 'Nav_' + about.id,
				units,
				style,
			}
		}

		/**
		 * A component becomes a class like a page does, and for the same reason:
		 * whatever is placed several times is declared once and referred to by
		 * name. Instances of it carry only where they sit.
		 *
		 * The frame of the master gives the class its layout and nothing else —
		 * the size belongs to each instance, which is what makes one component
		 * usable in a narrow column and in a wide row.
		 */
		static part(
			comp: $bog_figmol_gen_comp,
			about: {
				id: string,
				title: string,
				comp: string,
				accent: string,
				comps: Readonly< Record< string, string > >,
			},
		): $bog_figmol_gen_part {

			const frame = comp.root ?? { kind: 'frame' } as $bog_figmol_gen_node

			// The master is turned into a unit like any other node — that is how a
			// component made out of a card stays a card, and one made out of a text
			// keeps its caption. Its own name is never emitted, so the counter
			// starts below one and the children come out as Node1 upwards.
			const ctx = { count: -1, accent: about.accent, comps: about.comps }
			const head = this.unit( frame, false, ctx, undefined )

			const style = this.style_loose( head.style, this.flow( frame ) )
			this.spread( style, head.kids )

			return {
				id: about.id,
				title: about.title,
				comp: about.comp,
				base: head.comp,
				head,
				units: head.kids,
				style,
			}
		}

		/**
		 * A style with the placement taken out of it.
		 *
		 * Where a component sits and how big it is belongs to every instance of it
		 * separately — that is what lets one component fit a narrow column and a
		 * wide row. What stays is the layout, the look and the padding.
		 *
		 * A master that places its children by hand still needs to be something
		 * they can be placed against, hence the `relative` put back.
		 */
		static style_loose( style: Record< string, unknown >, flow: boolean ) {

			const res = { ... style }

			for( const key of [ 'position', 'left', 'top', 'width', 'height', 'minHeight' ] ) delete res[ key ]

			if( !flow ) res.position = 'relative'

			return res
		}

		/** Every node of a subtree as a rule of the style sheet of its component. */
		static spread( style: Record< string, unknown >, units: readonly $bog_figmol_gen_unit[] ) {
			for( const unit of units ) {
				style[ unit.name ] = unit.style
				this.spread( style, unit.kids )
			}
		}

		/** A container lays its children out in a flex flow only when it has a direction. */
		static flow( node: $bog_figmol_gen_node | null | undefined ) {
			if( !node ) return false
			if( !$bog_figmol_blocks.container( node.kind ?? 'frame' ) ) return false
			return node.direction === 'row' || node.direction === 'column'
		}

		static unit(
			node: $bog_figmol_gen_node,
			flowed: boolean,
			ctx: $bog_figmol_gen_ctx,
			parent?: $bog_figmol_gen_node,
		): $bog_figmol_gen_unit {

			const kind = String( node.kind ?? 'rect' )
			const name = 'Node' + ( ++ctx.count )
			const props = node.props ?? {}
			const flow = this.flow( node )
			const holds = $bog_figmol_blocks.container( kind )

			// An instance is a placement and a class name. What it draws is
			// declared once, in the component, so nothing of it is repeated here —
			// and a component the site no longer has leaves an empty box behind
			// rather than half a page.
			const master = kind === 'inst' ? ( ctx.comps[ String( node.master ?? '' ) ] ?? '' ) : ''

			const style: Record< string, unknown > = {}
			figmol_gen_assign( style, this.style_place( node, flowed, parent ) )
			figmol_gen_assign( style, this.style_kind( node, ctx.accent ) )
			if( flow ) figmol_gen_assign( style, this.style_flow( node ) )
			else if( holds ) style.position = style.position ?? 'relative'
			figmol_gen_assign( style, this.style_props( props ) )

			const kids = holds
				? ( node.kids ?? [] ).map( kid => this.unit( kid, flow, ctx, node ) )
				: []

			return {
				name,
				kind,
				comp: master || this.comp( kind ),
				title: figmol_gen_line( props.text ?? props.title ?? '' ),
				note: figmol_gen_line( props.note ?? '' ),
				variant: figmol_gen_variant( props.variant ),
				uri: kind === 'image' ? figmol_gen_uri( props.uri ?? props.src ) : figmol_gen_uri( props.href ?? props.uri ),
				value: Math.max( 0, figmol_gen_round( props.value, 0 ) ),
				max: Math.max( 1, figmol_gen_round( props.max, 100 ) ),
				options: figmol_gen_options( props.options ),
				style,
				kids,
			}
		}

		/**
		 * Component a kind is built out of. The `bui_` kinds are drawn with the
		 * very components the editor showed on the canvas, so a published page
		 * looks the way it was assembled and keeps its own style sheet out of it.
		 */
		static comp( kind: string ) {
			switch( kind ) {
				case 'text': return figmol_gen_sign( 'mol_paragraph' )
				case 'image': return figmol_gen_sign( 'mol_image' )
				case 'button': return figmol_gen_sign( 'mol_link' )
				case 'bui_card': return figmol_gen_sign( 'bog_builderui_card' )
				case 'bui_button': return figmol_gen_sign( 'bog_builderui_button' )
				case 'bui_badge': return figmol_gen_sign( 'bog_builderui_badge' )
				case 'bui_alert': return figmol_gen_sign( 'bog_builderui_alert' )
				case 'bui_field': return figmol_gen_sign( 'bog_builderui_field' )
				case 'bui_progress': return figmol_gen_sign( 'bog_builderui_progress' )
				case 'bui_tabs': return figmol_gen_sign( 'bog_builderui_tabs' )
				case 'bui_avatar': return figmol_gen_sign( 'bog_builderui_avatar' )
			}
			return figmol_gen_sign( 'mol_view' )
		}

		/* ---------------------------------------------------------------- styles */

		static style_root( site: $bog_figmol_gen_site, screens: readonly $bog_figmol_gen_screen[] ) {

			const theme = site.theme ?? {}

			const style: Record< string, unknown > = {
				flex: { direction: 'column' },
				minHeight: '100vh',
			}

			const back = figmol_gen_color( theme.back ?? theme.background )
			if( back ) style.background = { color: back }

			const text = figmol_gen_color( theme.text ?? theme.color )
			if( text ) style.color = text

			const family = this.family( theme )
			if( family ) style.font = { family }

			if( screens.length < 2 ) return style

			style.Nav = {
				flex: { direction: 'row', wrap: 'wrap' },
				gap: '1.5rem',
				padding: { top: '1rem', bottom: '1rem', left: '1.5rem', right: '1.5rem' },
				align: { items: 'center' },
			}

			style.Body = {
				flex: { grow: 1, direction: 'column' },
			}

			const accent = $bog_figmol_theme.value( theme, 'accent' )

			for( const screen of screens ) {
				style[ screen.nav ] = {
					'[mol_link_current]': {
						true: { color: accent },
					},
				}
			}

			return style
		}

		/**
		 * Css family the site is set in.
		 *
		 * A token of the theme names one of the families the component library
		 * carries, and that is what the panel writes. A stack spelled out by hand
		 * is still taken as it is: sites themed before the panel existed have one,
		 * and dropping it would silently restyle them.
		 */
		static family( theme: Readonly< Record< string, string > > ) {

			const raw = String( theme.font ?? theme.family ?? '' ).trim()
			const known = $bog_figmol_theme.font_family( $bog_figmol_theme.value( theme, 'font' ) )

			if( !raw || $bog_figmol_theme.fonts.includes( raw ) ) return known

			return figmol_gen_family( raw ) ?? known
		}

		/** Placement of a node inside its parent. */
		static style_place(
			node: $bog_figmol_gen_node,
			flowed: boolean,
			parent?: $bog_figmol_gen_node,
		) {

			const width = Math.max( 0, figmol_gen_round( node.w, 0 ) )
			const height = Math.max( 0, figmol_gen_round( node.h, 0 ) )
			const soft = String( node.kind ?? '' ) === 'text'

			if( !flowed ) {
				const style: Record< string, unknown > = {
					position: 'absolute',
					left: figmol_gen_round( node.x, 0 ) + 'px',
					top: figmol_gen_round( node.y, 0 ) + 'px',
				}
				if( width ) style.width = width + 'px'
				if( height ) style[ soft ? 'minHeight' : 'height' ] = height + 'px'
				return style
			}

			const stretch = ( parent?.align ?? 'stretch' ) === 'stretch'
			const style: Record< string, unknown > = { flex: { shrink: 0 } }

			if( parent?.direction === 'row' ) {
				if( width ) style.width = width + 'px'
				if( height && !stretch ) style.minHeight = height + 'px'
			} else {
				if( height ) style.minHeight = height + 'px'
				if( width && !stretch ) style.width = width + 'px'
			}

			return style
		}

		/** Auto Layout of a frame. */
		static style_flow( node: $bog_figmol_gen_node ) {

			const gap = Math.max( 0, figmol_gen_round( node.gap, 0 ) )
			const padding = Math.max( 0, figmol_gen_round( node.padding, 0 ) )

			const style: Record< string, unknown > = {
				flex: { direction: node.direction === 'row' ? 'row' : 'column' },
				gap: gap + 'px',
				padding: padding + 'px',
				align: { items: figmol_gen_items[ String( node.align ?? '' ) ] ?? 'stretch' },
			}

			return style
		}

		static style_kind( node: $bog_figmol_gen_node, accent = '#2563eb' ) {

			const kind = String( node.kind ?? 'rect' )
			const style: Record< string, unknown > = {}

			if( kind === 'text' ) {
				style.whiteSpace = 'pre-wrap'
			}

			if( kind === 'image' ) {
				style.objectFit = 'cover'
			}

			if( kind === 'button' ) {
				style.align = { items: 'center' }
				style.justify = { content: 'center' }
				style.padding = { top: '0.5rem', bottom: '0.5rem', left: '1rem', right: '1rem' }
				style.borderRadius = '0.5rem'
				// The accent of the theme is what a plain button is painted with,
				// which is the one place a colour picked in the panel shows up
				// without anybody putting it on an element by hand.
				style.background = { color: accent }
				style.color = '#ffffff'
				style.textAlign = 'center'
			}

			if( kind === 'rect' ) {
				style.background = { color: '#e5e7eb' }
				style.borderRadius = '0.25rem'
			}

			// A card of the library is meant to sit in a masonry column and brings
			// a bottom margin along for that. Here it is placed by hand, and the
			// margin would show up as a gap nobody asked for.
			if( kind === 'bui_card' ) style.margin = 0

			return style
		}

		/**
		 * Everything the inspector may have written. Unknown keys and values that
		 * do not pass validation are dropped: a generated repository has to
		 * compile, and a typed style sheet rejects anything but its own dialect.
		 */
		static style_props( props: Readonly< Record< string, string > > ) {

			const style: Record< string, unknown > = {}

			const color = figmol_gen_color( props.color )
			if( color ) style.color = color

			const back = figmol_gen_color( props.back ?? props.background )
			if( back ) style.background = { color: back }

			const font: Record< string, unknown > = {}

			const size = figmol_gen_length( props.size ?? props.font_size )
			if( size ) font.size = size

			const weight = figmol_gen_weight( props.weight ?? props.font_weight )
			if( weight ) font.weight = weight

			const family = figmol_gen_family( props.font ?? props.family )
			if( family ) font.family = family

			if( Object.keys( font ).length ) style.font = font

			const align = figmol_gen_text_align( props.align ?? props.text_align )
			if( align ) style.textAlign = align

			const radius = figmol_gen_length( props.radius )
			if( radius ) style.borderRadius = radius

			return style
		}

		/* ------------------------------------------------------------- view.tree */

		static view_tree( plan: $bog_figmol_gen_plan ) {

			const rows = [ this.view_tree_root( plan ) ]

			const view = figmol_gen_sign( 'mol_view' )

			for( const screen of plan.screens ) rows.push( this.view_tree_block( screen.comp, view, null, screen.units ) )
			for( const part of plan.parts ) rows.push( this.view_tree_block( part.comp, part.base, part.head, part.units ) )

			return rows.join( '\n' )
		}

		static view_tree_root( plan: $bog_figmol_gen_plan ) {

			const view = figmol_gen_sign( 'mol_view' )
			const link = figmol_gen_sign( 'mol_link' )
			const rows = [ plan.root + ' ' + view ]

			// Name of the browser tab: $mol takes `document.title` from the root
			// component and would otherwise name the site after its own class.
			rows.push( '\ttitle \\' + figmol_gen_line( plan.title ) )

			// The theme of the site, in the form the component library reads it:
			// the very attributes the editor had on its sheet.
			rows.push( '\tattr *' )
			rows.push( '\t\t^' )
			for( const [ key, val ] of Object.entries( plan.attrs ) ) {
				rows.push( '\t\t' + key + ' \\' + figmol_gen_line( val ) )
			}

			if( plan.screens.length < 2 ) {
				const only = plan.screens[ 0 ]
				rows.push( '\tsub /' )
				rows.push( '\t\t<= ' + only.prop + ' ' + only.comp )
				return rows.join( '\n' ) + '\n'
			}

			rows.push( '\tsub /' )
			rows.push( '\t\t<= Nav ' + view )
			rows.push( '\t\t\tsub /' )

			for( const screen of plan.screens ) {
				rows.push( '\t\t\t\t<= ' + screen.nav + ' ' + link )
				rows.push( '\t\t\t\t\turi \\#!page=' + screen.id )
				rows.push( '\t\t\t\t\tcurrent <= ' + screen.nav.toLowerCase() + '_current false' )
				rows.push( '\t\t\t\t\ttitle \\' + figmol_gen_line( screen.title ) )
			}

			rows.push( '\t\t<= Body ' + view )
			rows.push( '\t\t\tsub <= body /' + view )

			for( const screen of plan.screens ) {
				rows.push( '\t' + screen.prop + ' ' + screen.comp )
			}

			return rows.join( '\n' ) + '\n'
		}

		/**
		 * One declared component: a page, or a component of the site.
		 *
		 * A page is always a plain view holding what was drawn on it. A component
		 * is whatever its master was — a card master declares a card — and carries
		 * the properties of that master itself.
		 */
		static view_tree_block(
			comp: string,
			base: string,
			head: $bog_figmol_gen_unit | null,
			units: readonly $bog_figmol_gen_unit[],
		) {

			const rows = [ comp + ' ' + base ]

			if( head ) rows.push( ... this.view_tree_props( head, '\t' ) )

			if( units.length ) {
				rows.push( '\tsub /' )
				for( const unit of units ) rows.push( ... this.view_tree_unit( unit, 2 ) )
			}

			return rows.join( '\n' ) + '\n'
		}

		static view_tree_unit( unit: $bog_figmol_gen_unit, deep: number ): string[] {

			const pad = '\t'.repeat( deep )
			const rows = [ pad + '<= ' + unit.name + ' ' + unit.comp ]

			rows.push( ... this.view_tree_props( unit, pad + '\t' ) )

			if( unit.kids.length ) {
				rows.push( pad + '\tsub /' )
				for( const kid of unit.kids ) rows.push( ... this.view_tree_unit( kid, deep + 2 ) )
			}

			return rows
		}

		/** What a node declares beyond where it sits — captions, links, readings. */
		static view_tree_props( unit: $bog_figmol_gen_unit, pad: string ): string[] {

			const rows = [] as string[]

			switch( unit.kind ) {

				case 'image':
				case 'button':
				case 'bui_avatar':
					rows.push( pad + 'uri \\' + unit.uri )
					rows.push( pad + 'title \\' + unit.title )
					break

				case 'text':
					rows.push( pad + 'title \\' + unit.title )
					break

				case 'bui_button':
				case 'bui_badge':
					rows.push( pad + 'title \\' + unit.title )
					rows.push( pad + 'variant \\' + unit.variant )
					break

				case 'bui_alert':
					rows.push( pad + 'title \\' + unit.title )
					rows.push( pad + 'text \\' + unit.note )
					break

				case 'bui_field':
					rows.push( pad + 'hint \\' + unit.title )
					break

				case 'bui_progress':
					rows.push( pad + 'value ' + unit.value )
					rows.push( pad + 'max ' + unit.max )
					break

				case 'bui_tabs':
					rows.push( pad + 'options *' )
					for( const [ key, title ] of unit.options ) {
						rows.push( pad + '\t' + key + ' \\' + title )
					}
					break

			}

			return rows
		}

		/* --------------------------------------------------------------- view.ts */

		/** Routing is the only reason for a script, so a one page site skips it. */
		static view_ts( plan: $bog_figmol_gen_plan ) {

			if( plan.screens.length < 2 ) return ''

			const first = plan.screens[ 0 ]

			const rows = [
				'namespace $.$$ {',
				'',
				'\texport class ' + plan.root + ' extends $.' + plan.root + ' {',
				'',
				'\t\tpage_id() {',
				'\t\t\treturn this.$.' + figmol_gen_sign( 'mol_state_arg' ) + '.value( ' + figmol_gen_quote( 'page' ) + ' ) || ' + figmol_gen_quote( first.id ),
				'\t\t}',
				'',
				'\t\t@ ' + figmol_gen_sign( 'mol_mem' ),
				'\t\toverride body() {',
				'\t\t\tswitch( this.page_id() ) {',
			]

			for( const screen of plan.screens.slice( 1 ) ) {
				rows.push( '\t\t\t\tcase ' + figmol_gen_quote( screen.id ) + ': return [ this.' + screen.prop + '() ]' )
			}

			rows.push( '\t\t\t\tdefault: return [ this.' + first.prop + '() ]' )
			rows.push( '\t\t\t}' )
			rows.push( '\t\t}' )

			for( const screen of plan.screens ) {
				rows.push( '' )
				rows.push( '\t\toverride ' + screen.nav.toLowerCase() + '_current() {' )
				rows.push( '\t\t\treturn this.page_id() === ' + figmol_gen_quote( screen.id ) )
				rows.push( '\t\t}' )
			}

			rows.push( '' )
			rows.push( '\t}' )
			rows.push( '' )
			rows.push( '}' )

			return rows.join( '\n' ) + '\n'
		}

		/* ----------------------------------------------------------- view.css.ts */

		static view_css( plan: $bog_figmol_gen_plan ) {

			const define = figmol_gen_sign( 'mol_style_define' )

			const rows = [ 'namespace $ {', '' ]

			rows.push( '\t' + define + '( ' + plan.root + ', ' + this.code( plan.style, 1 ) + ' )' )

			for( const screen of plan.screens ) {
				rows.push( '' )
				rows.push( '\t' + define + '( ' + screen.comp + ', ' + this.code( screen.style, 1 ) + ' )' )
			}

			for( const part of plan.parts ) {
				rows.push( '' )
				rows.push( '\t' + define + '( ' + part.comp + ', ' + this.code( part.style, 1 ) + ' )' )
			}

			rows.push( '' )
			rows.push( '}' )

			return rows.join( '\n' ) + '\n'
		}

		/** Serializes a plain value into TypeScript source with tab indentation. */
		static code( value: unknown, deep: number ): string {

			if( value === null || value === undefined ) return 'null'
			if( typeof value === 'number' ) return String( value )
			if( typeof value === 'boolean' ) return String( value )
			if( typeof value === 'string' ) return figmol_gen_quote( value )

			const pad = '\t'.repeat( deep )
			const rows = Object.entries( value as object ).map(
				( [ key, val ] )=> pad + '\t' + figmol_gen_key( key ) + ': ' + this.code( val, deep + 1 ) + ','
			)

			if( !rows.length ) return '{}'

			return '{\n' + rows.join( '\n' ) + '\n' + pad + '}'
		}

		/* ------------------------------------------------------------- meta files */

		static index_html( plan: $bog_figmol_gen_plan ) {
			const title = figmol_gen_html( plan.title )
			return [
				'<!doctype html>',
				'<html lang="en" mol_view_root>',
				'\t<head>',
				'\t\t<meta charset="utf-8" />',
				'\t\t<meta name="viewport" content="width=device-width, initial-scale=1" />',
				'\t\t<meta name="mobile-web-app-capable" content="yes" />',
				'\t\t<title>' + title + '</title>',
				'\t\t<meta name="description" content="' + title + '" />',
				'\t\t<meta property="og:title" content="' + title + '" />',
				'\t\t<meta property="og:type" content="website" />',
				'\t</head>',
				'\t<body mol_view_root>',
				'\t\t<div mol_view_root="' + figmol_gen_html( plan.root ) + '"></div>',
				'\t\t<script src="web.js"></script>',
				'\t</body>',
				'</html>',
				'',
			].join( '\n' )
		}

		static readme( plan: $bog_figmol_gen_plan, options: $bog_figmol_gen_options ) {

			const repo = options.repo ?? ''
			const pages = plan.screens.map( screen => '- ' + screen.title + ' — `#!page=' + screen.id + '`' )

			return [
				'# ' + plan.title,
				'',
				'A [' + figmol_gen_sign( 'mol' ) + '](https://mol.hyoo.ru/) application built with Figmol.',
				'The sources here are ordinary MAM modules — edit them by hand and the site keeps working.',
				'',
				'## Pages',
				'',
				... pages,
				'',
				'## Local run',
				'',
				'```bash',
				'git clone https://github.com/hyoo-ru/mam.git ./mam && cd mam',
				repo ? 'git clone https://github.com/' + repo + '.git ./' + plan.name : 'git clone <this repo> ./' + plan.name,
				'npm install && npm start ' + plan.name,
				'```',
				'',
				'Then open `http://localhost:9080/' + plan.name + '/-/index.html`.',
				'',
				'## Publishing',
				'',
				'A push to `main` runs `.github/workflows/deploy.yml`, which builds the bundle with MAM',
				'and pushes it to the `gh-pages` branch.',
				'',
			].join( '\n' )
		}

		static workflow( plan: $bog_figmol_gen_plan ) {
			return [
				'name: ' + figmol_gen_yaml( plan.name ),
				'',
				'permissions: write-all',
				'',
				'on:',
				'    workflow_dispatch:',
				'    push:',
				'',
				'concurrency:',
				'    group: deploy-${{ github.ref }}',
				'    cancel-in-progress: true',
				'',
				'jobs:',
				'    build:',
				'        runs-on: ubuntu-latest',
				'',
				'        steps:',
				'            - uses: hyoo-ru/mam_build@master2',
				'              with:',
				'                  package: ' + figmol_gen_yaml( plan.name ),
				'',
				'            - uses: hyoo-ru/gh-deploy@v4.4.1',
				'              if: github.ref == \'refs/heads/main\' || github.ref == \'refs/heads/master\'',
				'              with:',
				'                  folder: ' + figmol_gen_yaml( plan.name + '/-' ),
				'',
			].join( '\n' )
		}

	}

}
