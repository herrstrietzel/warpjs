import { getSegmentSchema } from './utils'

const segmentExpr = /([mzlhvcsqta])([^mzlhvcsqta]*)/ig
const numberExpr = /-?[0-9]*\.?[0-9]+(?:e[-+]?\d+)?/ig

export default function parser(pathString) {
	const pathData = []

	let segmentMatch
	segmentExpr.lastIndex = 0

	/**
	 * A - Arc commands
	 * large arc and sweep flags
	 * are boolean and can be concatenated like
	 * 11 or 01
	 * or be concatenated with the final on path points like
	 * 1110 10 => 1 1 10 10
	 */
	const fixArcValues = (values)=>{
		let n = 0, arcValues = [];

		for (let i = 0; i < values.length; i++) {
			let value = values[i].toString();

			// reset counter if max values are reached
			if (n >= 7) {
				n = 0;
			}
			// if 3. or 4. parameter longer than 1
			if ((n === 3 || n === 4) && value.length > 1) {
				let largeArc = n === 3 ? value.substring(0, 1) : "";
				let sweep = n === 3 ? value.substring(1, 2) : value.substring(0, 1);
				let finalX = n === 3 ? value.substring(2) : value.substring(1);
				let comN = [largeArc, sweep, finalX].filter(Boolean);
				arcValues.push(comN);
				n += comN.length;

			} else {
				// regular
				arcValues.push(value);
				n++;
			}
		}

		// retun fixed value array
		return arcValues.flat().filter(Boolean);
	}

	while ((segmentMatch = segmentExpr.exec(pathString))) {
		const type = segmentMatch[1].toLowerCase()
		const relative = (type === segmentMatch[1])
		const schema = getSegmentSchema(type)

		// we keep values as strings to detect concatenated arc params
		let values = (segmentMatch[2].match(numberExpr) || [])

		if (values.length < schema.length) {
			throw new Error(`Malformed path data: type "${type}" has ${values.length} arguments, expected ${scheme.length}`)
		}

		if (schema.length > 0) {
			if (values.length % schema.length !== 0) {
				let hasError = true;

				// try to parse concatenated Arc values
				if (type === 'a') {
					values = fixArcValues(values)

					// check if value count is correct
					if(values.length % schema.length === 0){
						hasError = false;
					}
				}
				if(hasError){
					throw new Error(`Malformed path data: type "${type}" has ${values.length} arguments, ${values.length % schema.length} too many`)
				}
			}

			// parse values to numbers
			values = values.map(Number)

			for (let i = 0; i < values.length / schema.length; i++) {
				const segmentData = { type, relative }

				// implicit linetos
				if(type==='m' && i>0 ) segmentData.type = 'l';

				for (let j = 0; j < schema.length; j++) {
					segmentData[schema[j]] = values[i * schema.length + j]
				}

				pathData.push(segmentData)
			}
		}
		else {
			pathData.push({ type, relative })
		}
	}

	return pathData
}
