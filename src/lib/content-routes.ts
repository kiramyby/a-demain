function encodeRouteParamCharacter(character: string): string {
	return `%${character.charCodeAt(0).toString(16).toUpperCase()}`;
}

export function termRouteParam(term: string): string {
	const encoded = encodeURIComponent(term)
		.replace(/[!'()*]/g, encodeRouteParamCharacter)
		.replace(/~/g, "%7E")
		.replace(/\./g, "%2E")
		.replace(/%/g, "~");

	return `t_${encoded}`;
}

export function categoryHref(category: string): string {
	return `/categories/${termRouteParam(category)}/`;
}

export function tagHref(tag: string): string {
	return `/tags/${termRouteParam(tag)}/`;
}
