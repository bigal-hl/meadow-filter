/**
* Meadow Endpoint Utility Function - Parse a Filter String and put it into a Query.
*
* @license MIT
*
* @author Steven Velozo <steven@velozo.com>
* @module Meadow
*/
/**
* Parse GET-passed Filter Strings, turn the results into proper Meadow query stanzas

 Take the filter and return an array of filter instructions
 Basic instruction anatomy:
       INSTRUCTION~FIELD~OPERATOR~VALUE
 FOP - Filter Open Paren
       FOP~0~(~0
 FOPOR - Filter Open Paren (left-side OR connected)
       FOPOR~0~(~0
 FCP - Filter Close Paren
       FCP~0~)~0
 FBV - Filter By Value (left-side AND connected)
       FBV~Category~EQ~Books
       Possible comparisons:
       * EQ - Equals To (=)
       * NE - Not Equals To (!=)
       * GT - Greater Than (>)
       * GE - Greater Than or Equals To (>=)
       * LT - Less Than (<)
       * LE - Less Than or Equals To (<=)
       * LK - Like (Like)
       * IN - Is NULL
       * NN - Is NOT NULL
       * INN - IN list
       * NIN - NOT IN list
 FBVOR - Filter By Value (left-side OR connected)
 FBL - Filter By List (value list, separated by commas)
       FBL~Category~EQ~Books,Movies
 FBD - Filter by Date (exclude time)
       FBD~UpdateDate~EQ~2015-10-01
 FSF - Filter Sort Field
       FSF~Category~ASC~0
       FSF~Category~DESC~0
 FDST - Filter by Distinct (adds distinct keyword to Read and Count queries)
       FDST~0~0~0~

 This means: FBV~Category~EQ~Books~FBV~PublishedYear~GT~2000~FSF~PublishedYear~DESC~0
             Filters down to ALL BOOKS PUBLUSHED AFTER 2000 IN DESCENDING ORDER

 Similar queries are supported for fields that contain a JSON object The FIELD is in a dot notation.
 Basic Anatomy of FIELD:
        TABLECOLUMN.KEY
		where TABLECOLUMN is the record column according to the schema
		and KEY is a property of the JSON contained in TABLECOLUMN. `.KEY` may be repeated for nested JSON objects.
 FBJV - Filter By JSON Value (left-side AND connected)
       FBJV~FormData.Meta.FeatureEnabled~EQ~True
       Possible comparisons:
       * EQ - Equals To (=)
       * NE - Not Equals To (!=)
       * GT - Greater Than (>)
       * GE - Greater Than or Equals To (>=)
       * LT - Less Than (<)
       * LE - Less Than or Equals To (<=)
       * LK - Like (Like)
       * IN - Is NULL
       * NN - Is NOT NULL
       * INN - IN list
       * NIN - NOT IN list
 FBJVOR - Filter By JSON Value (left-side OR connected)
 FBJL - Filter By JSON List (value list, separated by commas)
       FBJL~FormDataJSON.Tidings.Data.Type~INN~ChangeOrder,Payment Form
 FBJLOR - Filter By JSON List (value list, separated by commas, left-side OR connected)
       FBJLOR~FormDataJSON.Tidings.Data.Type~INN~ChangeOrder,Payment Form
 FBJD - Filter by JSON Date (exclude time)
       FBJD~FormDataJSON.UpdateDate~EQ~2015-10-01
 FSJF - Filter Sort JSON Field
       FSJF~FormDataJSON.Category~ASC~0
       FSJF~FormDataJSON.Category~DESC~<cast>
          where <cast> can be in (UINT,SINT,CHAR,DD,DATE) - defaults to CHAR
*/

// Get the comparison operator for use in a query stanza
const getFilterComparisonOperator = (pFilterOperator) =>
{
	let tmpOperator = '=';
	switch(pFilterOperator)
	{
		case 'EQ':
			tmpOperator = '=';
			break;
		case 'NE':
			tmpOperator = '!=';
			break;
		case 'GT':
			tmpOperator = '>';
			break;
		case 'GE':
			tmpOperator = '>=';
			break;
		case 'LT':
			tmpOperator = '<';
			break;
		case 'LE':
			tmpOperator = '<=';
			break;
		case 'LK':
			tmpOperator = 'LIKE';
			break;
		case 'NLK':
			tmpOperator = 'NOT LIKE';
			break;
		case 'IN':
			tmpOperator = 'IS NULL';
			break;
		case 'NN':
			tmpOperator = 'IS NOT NULL';
			break;
		case 'INN':
			tmpOperator = 'IN';
			break;
		case 'NIN':
			tmpOperator = 'NOT IN';
			break;
		case 'FOP':
		case 'FOPOR':
			tmpOperator = '(';
			break;
		case 'FCP':
			tmpOperator = ')';
			break;
	}
	return tmpOperator;
};

/**
 *
 * @param {string} encodedType - "encoded" type from the filter-parse request
 * @return {string} meadow-friendly type (e.g. SQL type that one could cast to)
 */
const getDataType = (encodedType) =>
{
	let type = 'CHAR';
	switch (encodedType)
	{
		case 'SINT':
			type = 'SIGNED';
			break;
		case 'UINT':
			type = 'UNSIGNED';
			break;
		case 'DD':
			// base 10, 5 decimal places (should cover 99% of use cases)
			type = 'DECIMAL(10,5)';
			break;
		case 'DATE':
			type = 'DATE';
			break;
		default:
			break;
	}
	return type;
};

/**
 * @spec prepares/formats client inputs so they can be safely added to a query string
 * @param {Array<string>} values - a list of client inputs to a query
 * @return {Array<string>} the formatted values
 */
const prepareQueryValues = (values) =>
{
	return values.map((v) =>
	{
		// escape quotes
		return v.replaceAll("'", "\\'").replaceAll('"', '\\"');
	});
};

/**
 * @spec fieldColumn is the target database (table) column; jsonPath is the target path to use for JSON_EXTRACT
 * @param {object} pFilterStanza - a filter stanza with the properties defined in the interface
 * @returns {object} structure { fieldColumn, jsonPath }
 */
const parseJSONFieldAndPath = (pFilterStanza) =>
{
	const splitIndex = pFilterStanza.Field.indexOf('.');
	if (splitIndex < 1)
	{
		const msg = `Invalid format for Field[${pFilterStanza.Field}]`;
		throw new Error(msg);
	}
	const fieldColumnRaw = pFilterStanza.Field.substring(0, splitIndex);
	const jsonPathRaw = pFilterStanza.Field.substring(splitIndex);
	let [ fieldColumn, jsonPath ] = prepareQueryValues([fieldColumnRaw, jsonPathRaw]);
	const result =
	{
		fieldColumn,
		jsonPath
	};
	return result;
};

/**
 * @spec generates the appropriate filter(s) for looking inside a JSON field
 * @param {string} fieldColumn - the target column for the meadow entity
 * @param {string} jsonPath - the target chain (. notation) of possibly nested json keys in the value of 'fieldColumn'
 * @param {number|string|Array|object} value - the value to use in the filter for comparison
 * @param {string} comparisonOperator - the comparison operator (e.g. =, <=, NOT IN)
 * @param {string} connector - the logical connector to this query (AND/OR)
 * @param {object} pQuery - the foxhound query object
 * @return {object} pQuery
 */
const addFilterJSONToQuery = (fieldColumn, jsonPath, value, comparisonOperator, connector, pQuery) =>
{
	pQuery.addFilter('', '', '(');
	// TODO: prefix 'fieldColumn' with table name to avoid ambiguity (e.g. in joins)
	pQuery.addFilter(`JSON_VALID(${fieldColumn})`, 1, '=', 'AND', 'validJson');
	let command = `CAST(JSON_UNQUOTE(JSON_EXTRACT(${fieldColumn}, '$${jsonPath}')) AS CHAR)`;
	// finalValue will be the value to use in the filter
	let finalValue = value;
	// determine the finalValue based on the expected data type of the input. Distinguish between string and number.
	// NOTE: strings like "1 " are a number (1) and would be cast appropriately here
	if (Array.isArray(value))
	{
		// if the value is a list (e.g. for FBJL), apply the same treatment to all entries.
		const nanFound = value.find((v) => isNaN(Number(v)));
		if (!nanFound)
		{
			// assumption: since all entries are numbers, we can set up a number comparison
			finalValue = value.map((v) => Number(v));
		}
	}
	else if (!isNaN(Number(value)))
	{
		// assumption: since request contained a number embedded in a string, number comparison is desired
		// value is a number, extract it from the strings
		finalValue = Number(value);
	}
	pQuery.addFilter(command, finalValue, comparisonOperator, connector, 'jsonExtracted');
	pQuery.addFilter('', '', ')');
	// to follow foxhound query builder chaining
	return pQuery;
};

const addFilterStanzaToQuery = (pFilterStanza, pQuery) =>
{
	if (!pFilterStanza.Instruction)
	{
		return false;
	}

	switch(pFilterStanza.Instruction)
	{
		case 'FBV':   // Filter by Value (left-side AND)
			pQuery.addFilter(pFilterStanza.Field, pFilterStanza.Value, getFilterComparisonOperator(pFilterStanza.Operator), 'AND');
			break;

		case 'FBVOR': // Filter by Value (left-side OR)
			pQuery.addFilter(pFilterStanza.Field, pFilterStanza.Value, getFilterComparisonOperator(pFilterStanza.Operator), 'OR');
			break;

		case 'FBL':   // Filter by List (left-side AND)
			// Just split the value by comma for now.  May want to revisit better characters or techniques later.
			pQuery.addFilter(pFilterStanza.Field, pFilterStanza.Value.split(','), getFilterComparisonOperator(pFilterStanza.Operator), 'AND');
			break;

		case 'FBLOR': // Filter by List (left-side OR)
			// Just split the value by comma for now.  May want to revisit better characters or techniques later.
			pQuery.addFilter(pFilterStanza.Field, pFilterStanza.Value.split(','), getFilterComparisonOperator(pFilterStanza.Operator), 'OR');
			break;

		case 'FBD':   // Filter by Date (exclude time)
			pQuery.addFilter(`DATE(${pFilterStanza.Field})`, pFilterStanza.Value.split(','), getFilterComparisonOperator(pFilterStanza.Operator), 'AND', pFilterStanza.Field);
			break;

		case 'FBDOR': // Filter by Date (exclude time)
			pQuery.addFilter(`DATE(${pFilterStanza.Field})`, pFilterStanza.Value.split(','), getFilterComparisonOperator(pFilterStanza.Operator), 'OR', pFilterStanza.Field);
			break;

		case 'FSF':   // Filter Sort Field
			const tmpSortDirection = (pFilterStanza.Operator === 'DESC') ? 'Descending' : 'Ascending';
			pQuery.addSort({ Column: pFilterStanza.Field, Direction: tmpSortDirection });
			break;

		case 'FBJV':   // Filter by JSON Value (left-side AND)
		{
			const { fieldColumn, jsonPath } = parseJSONFieldAndPath(pFilterStanza);
			addFilterJSONToQuery(fieldColumn, jsonPath, pFilterStanza.Value, getFilterComparisonOperator(pFilterStanza.Operator), 'AND', pQuery);
			break;
		}

		case 'FBJVOR': // Filter by JSON Value (left-side OR)
		{
			const { fieldColumn, jsonPath } = parseJSONFieldAndPath(pFilterStanza);
			addFilterJSONToQuery(fieldColumn, jsonPath, pFilterStanza.Value, getFilterComparisonOperator(pFilterStanza.Operator), 'OR', pQuery);
			break;
		}

		case 'FBJL':   // Filter by JSON List (left-side AND)
		{
			const { fieldColumn, jsonPath } = parseJSONFieldAndPath(pFilterStanza);
			// Just split the value by comma for now.  May want to revisit better characters or techniques later.
			addFilterJSONToQuery(fieldColumn, jsonPath, pFilterStanza.Value.split(','), getFilterComparisonOperator(pFilterStanza.Operator), 'AND', pQuery);
			break;
		}

		case 'FBJLOR': // Filter by JSON List (left-side OR)
		{
			const { fieldColumn, jsonPath } = parseJSONFieldAndPath(pFilterStanza);
			// Just split the value by comma for now.  May want to revisit better characters or techniques later.
			addFilterJSONToQuery(fieldColumn, jsonPath, pFilterStanza.Value.split(','), getFilterComparisonOperator(pFilterStanza.Operator), 'OR', pQuery);
			break;
		}

		case 'FBJD':   // Filter by JSON Date (exclude time)
		{
			const { fieldColumn, jsonPath } = parseJSONFieldAndPath(pFilterStanza);
			pQuery.addFilter('', '', '(');
			// TODO: prefix 'fieldColumn' with table name to avoid ambiguity (e.g. in joins)
			pQuery.addFilter(`JSON_VALID(${fieldColumn})`, 1, '=', 'AND', 'validJson');
			// NOTE: the date value in the json needs to be in some "year month day" (followed by time, optional) format for SQL 'DATE' to recognize it
			// ASSUMPTION: use of .split() here is modeled after the FBD case. It always returns a list, no matter the comparison operator. We assume that retold will handle stripping the list of way where it makes sense (e.g. EG, GT)
			pQuery.addFilter(`DATE(JSON_UNQUOTE(JSON_EXTRACT(${fieldColumn}, '$${jsonPath}')))`, pFilterStanza.Value.split(','), getFilterComparisonOperator(pFilterStanza.Operator), 'AND', fieldColumn);
			pQuery.addFilter('', '', ')');
			break;
		}

		case 'FSJF':   // Filter Sort JSON Field
		{
			const { fieldColumn, jsonPath } = parseJSONFieldAndPath(pFilterStanza);
			const sortDirection = (pFilterStanza.Operator === 'DESC') ? 'Descending' : 'Ascending';
			const sortingType = getDataType(pFilterStanza.Value);
			// TODO: prefix 'fieldColumn' with table name to avoid ambiguity (e.g. in joins)
			pQuery.addFilter(`JSON_VALID(${fieldColumn})`, 1, '=', 'AND', 'validJson');
			// cast to the expected data type, otherwise bad things happen (e.g. numbers are compared as strings)
			pQuery.addSort({ Column: `CAST(${fieldColumn} ->> '$${jsonPath}' AS ${sortingType})`, Direction: sortDirection });
			break;
		}

		case 'FOP':   // Filter Open Paren  (left-side AND)
			pQuery.addFilter('', '', '(');
			break;

		case 'FOPOR': // Filter Open Paren  (left-side OR)
			pQuery.addFilter('', '', '(', 'OR');
			break;

		case 'FCP':   // Filter Close Paren
			pQuery.addFilter('', '', ')');
			break;

		case 'FDST':  // Filter Distinct
			// ensure we don't break if using an older foxhound version
			if (pQuery.setDistinct)
			{
				pQuery.setDistinct(true);
			}
			break;

		default:
			//console.log('Unparsable filter stanza.');
			return false;
	}

	// Be paranoid about the instruction
	pFilterStanza.Instruction = false;
	return true;
};

const doParseFilter = (pFilterString, pQuery) =>
{
	if (typeof(pFilterString) !== 'string')
	{
		return false;
	}

	const tmpFilterTerms = pFilterString.split('~');

	if (tmpFilterTerms.length < 4)
	{
		return true;
	}

	let tmpFilterStanza = { Instruction: false };

	for (let i = 0; i < tmpFilterTerms.length; i++)
	{
		switch(i % 4)
		{
			case 0:  // INSTRUCTION
				addFilterStanzaToQuery(tmpFilterStanza, pQuery);
				//console.log(i+' Instruction: '+tmpFilterTerms[i]);
				tmpFilterStanza = (
				{
					Instruction: tmpFilterTerms[i],
					Field: '',
					Operator: '',
					Value: ''
				});
				break;

			case 1:  // FIELD
				//console.log(i+' Field:       '+tmpFilterTerms[i]);
				tmpFilterStanza.Field = tmpFilterTerms[i];
				break;

			case 2:  // OPERATOR
				//console.log(i+' Operator:    '+tmpFilterTerms[i]);
				tmpFilterStanza.Operator = tmpFilterTerms[i];
				break;

			case 3:  // VALUE
				//console.log(i+' Value:       '+tmpFilterTerms[i]);
				tmpFilterStanza.Value = tmpFilterTerms[i];
				break;
		}
	}

	addFilterStanzaToQuery(tmpFilterStanza, pQuery);

	return true;
};

module.exports = doParseFilter;
