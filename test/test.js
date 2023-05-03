const chai = require('chai');
const sinon = require('sinon');
const expect = chai.expect;
const assert = chai.assert;

suite('Filter Stanza Parse', () =>
{
    const parse = require('../source/Meadow-Filter').parse;
    let queryStub = { addFilter: () => { }, setDistinct: () => { }, addSort: () => { } };
    let queryMock;

    setup(() =>
    {
        queryMock = sinon.mock(queryStub);
    });

    teardown(() =>
    {
        sinon.restore();
    });

    //TODO: add more test cases...
    test('Filter by Value - EQ', () =>
    {
        // given
        const filterString = 'FBV~IDWaffle~EQ~123';
        queryMock.expects('addFilter').once().withArgs('IDWaffle', '123', '=', 'AND');

        // when
        parse(filterString, queryStub);

        // then
        queryMock.verify();
    });

    test('Filter by List - INN', () =>
    {
        // given
        const filterString = 'FBL~IDWaffle~INN~1,23,456';
        queryMock.expects('addFilter').once().withArgs('IDWaffle', [ '1', '23', '456' ], 'IN', 'AND');

        // when
        parse(filterString, queryStub);

        // then
        queryMock.verify();
    });

    test('Filter by List - NIN', () =>
    {
        // given
        const filterString = 'FBL~IDWaffle~NIN~1,23,456';
        queryMock.expects('addFilter').once().withArgs('IDWaffle', [ '1', '23', '456' ], 'NOT IN', 'AND');

        // when
        parse(filterString, queryStub);

        // then
        queryMock.verify();
    });

    test('Compound Filter with FBLOR', () =>
    {
        // given
        const filterString = 'FOP~0~(~0~FBV~Limit~GT~5~FBVOR~Limit~LT~0~FCP~0~)~0~FBLOR~IDWaffle~INN~1,23,456';
        queryMock.expects('addFilter').once().withArgs('', '', '(');
        queryMock.expects('addFilter').once().withArgs('Limit', '5', '>', 'AND');
        queryMock.expects('addFilter').once().withArgs('Limit', '0', '<', 'OR');
        queryMock.expects('addFilter').once().withArgs('', '', ')');
        queryMock.expects('addFilter').once().withArgs('IDWaffle', [ '1', '23', '456' ], 'IN', 'OR');

        // when
        parse(filterString, queryStub);

        // then
        queryMock.verify();
    });

    test('Compound Filter', () =>
    {
        // given
        const filterString = 'FBL~IDWaffle~INN~1,23,456~FOP~0~(~0~FBV~Limit~GT~5~FBVOR~Limit~LT~0~FCP~0~)~0';
        queryMock.expects('addFilter').once().withArgs('IDWaffle', [ '1', '23', '456' ], 'IN', 'AND');
        queryMock.expects('addFilter').once().withArgs('', '', '(');
        queryMock.expects('addFilter').once().withArgs('Limit', '5', '>', 'AND');
        queryMock.expects('addFilter').once().withArgs('Limit', '0', '<', 'OR');
        queryMock.expects('addFilter').once().withArgs('', '', ')');

        // when
        parse(filterString, queryStub);

        // then
        queryMock.verify();
    });

    test('Compound Filter with FOPOR', () =>
    {
        // given
        const filterString = 'FBL~IDWaffle~INN~1,23,456~FOPOR~0~(~0~FBV~Limit~GT~5~FBVOR~Limit~LT~0~FCP~0~)~0';
        queryMock.expects('addFilter').once().withArgs('IDWaffle', [ '1', '23', '456' ], 'IN', 'AND');
        queryMock.expects('addFilter').once().withArgs('', '', '(', 'OR');
        queryMock.expects('addFilter').once().withArgs('Limit', '5', '>', 'AND');
        queryMock.expects('addFilter').once().withArgs('Limit', '0', '<', 'OR');
        queryMock.expects('addFilter').once().withArgs('', '', ')');

        // when
        parse(filterString, queryStub);

        // then
        queryMock.verify();
    });

    test('Filter distinct', () =>
    {
        // given
        const filterString = 'FDST~0~0~0';
        queryMock.expects('setDistinct').once().withArgs(true);

        // when
        parse(filterString, queryStub);

        // then
        queryMock.verify();
    });

    suite('JSON filter stanzas', () =>
    {
        test('Filter by JSON Value - EQ', () =>
        {
            // given
            const filterString = 'FBJV~FormData.IDWaffle~EQ~123';
            queryMock.expects('addFilter').once().withArgs('','','(');
            queryMock.expects('addFilter').once().withArgs('', 1, 'JSON_VALID(FormData) =', 'AND');
            queryMock.expects('addFilter').once().withArgs('JSON_UNQUOTE(JSON_EXTRACT(FormData, \'$.IDWaffle\'))', 123, '=', 'AND');
            queryMock.expects('addFilter').once().withArgs('','',')');

            // when
            parse(filterString, queryStub);

            // then
            queryMock.verify();
        });

        test('Filter by JSON Value - GT + OR', () =>
        {
            // given
            const filterString = 'FBJVOR~FormData.IDWaffle~GT~123';
            queryMock.expects('addFilter').once().withArgs('','','(');
            queryMock.expects('addFilter').once().withArgs('', 1, 'JSON_VALID(FormData) =', 'AND');
            queryMock.expects('addFilter').once().withArgs('JSON_UNQUOTE(JSON_EXTRACT(FormData, \'$.IDWaffle\'))', 123, '>', 'OR');
            queryMock.expects('addFilter').once().withArgs('','',')');

            // when
            parse(filterString, queryStub);

            // then
            queryMock.verify();
        });

        test('Filter by JSON List - INN', () =>
        {
            // given
            const filterString = 'FBJL~SomeField.IDWaffle~INN~1,23,456';
            queryMock.expects('addFilter').once().withArgs('','','(');
            queryMock.expects('addFilter').once().withArgs('', 1, 'JSON_VALID(SomeField) =', 'AND');
            queryMock.expects('addFilter').once().withArgs('JSON_UNQUOTE(JSON_EXTRACT(SomeField, \'$.IDWaffle\'))', [ 1, 23, 456 ], 'IN', 'AND');
            queryMock.expects('addFilter').once().withArgs('','',')');
            // when
            parse(filterString, queryStub);

            // then
            queryMock.verify();
        });

        test('Filter by JSON List - NIN', () =>
        {
            // given
            const filterString = 'FBJL~SomeField.IDWaffle~NIN~1,23,456';
            queryMock.expects('addFilter').once().withArgs('','','(');
            queryMock.expects('addFilter').once().withArgs('', 1, 'JSON_VALID(SomeField) =', 'AND');
            queryMock.expects('addFilter').once().withArgs('JSON_UNQUOTE(JSON_EXTRACT(SomeField, \'$.IDWaffle\'))', [ 1, 23, 456 ], 'NOT IN', 'AND');
            queryMock.expects('addFilter').once().withArgs('','',')');

            // when
            parse(filterString, queryStub);

            // then
            queryMock.verify();
        });

        test('Compound Filter with FBJLOR', () =>
        {
            // given
            const filterString = 'FOP~0~(~0~FBV~Limit~GT~5~FBVOR~Limit~LT~0~FCP~0~)~0~FBJLOR~SomeField.IDWaffle~INN~1,23,456';
            //// calls around non-json fields
            queryMock.expects('addFilter').once().withArgs('', '', '(');
            queryMock.expects('addFilter').once().withArgs('Limit', '5', '>', 'AND');
            queryMock.expects('addFilter').once().withArgs('Limit', '0', '<', 'OR');
            queryMock.expects('addFilter').once().withArgs('', '', ')');
            //// calls around json fields
            queryMock.expects('addFilter').once().withArgs('', '', '(');
            queryMock.expects('addFilter').once().withArgs('', 1, 'JSON_VALID(SomeField) =', 'AND');
            queryMock.expects('addFilter').once().withArgs('JSON_UNQUOTE(JSON_EXTRACT(SomeField, \'$.IDWaffle\'))', [ 1, 23 ,456 ], 'IN', 'OR');
            queryMock.expects('addFilter').once().withArgs('', '', ')');

            // when
            parse(filterString, queryStub);

            // then
            queryMock.verify();
        });

        test('Filter by JSON Date - LE', () =>
        {
            // given
            const filterString = 'FBJD~FormData.Meta.ApprovalDate~LE~2019-12-07';
            queryMock.expects('addFilter').once().withArgs('','','(');
            queryMock.expects('addFilter').once().withArgs('', 1, 'JSON_VALID(FormData) =', 'AND');
            // ASSUMPTION: use of a list for the LE operation. This library assumes that retold(foxhound) will handle stripping the list away in this case
            queryMock.expects('addFilter').once().withArgs('DATE(JSON_UNQUOTE(JSON_EXTRACT(FormData, \'$.Meta.ApprovalDate\')))', [ '2019-12-07' ], '<=', 'AND');
            queryMock.expects('addFilter').once().withArgs('','',')');

            // when
            parse(filterString, queryStub);

            // then
            queryMock.verify();
        });

        test('Filter Sort by JSON Field (default: string)', () =>
        {
            // given
            const filterString = 'FSJF~FormData.Meta.JCSequenceNumber~DESC~0';
            queryMock.expects('addFilter').once().withArgs('', 1, 'JSON_VALID(FormData) =', 'AND');
            queryMock.expects('addSort').once().withArgs({ Column: 'CAST(FormData ->> \'$.Meta.JCSequenceNumber\' AS CHAR)', Direction: 'Descending'});

            // when
            parse(filterString, queryStub);

            // then
            queryMock.verify();
        });

        const fsjfByNumberTests =
        [
            { requestedType: 'UINT', expectedType: 'UNSIGNED'},
            { requestedType: 'SINT', expectedType: 'SIGNED'},
            { requestedType: 'DD', expectedType: 'DECIMAL(10,5)'},
            { requestedType: 'DATE', expectedType: 'DATE'},
        ];
        fsjfByNumberTests.forEach((input) =>
        {
            test('Filter Sort by JSON Field (number)', () =>
            {
                // given
                const filterString = `FSJF~FormData.Meta.JCSequenceNumber~ASC~${input.requestedType}`;
                queryMock.expects('addFilter').once().withArgs('', 1, 'JSON_VALID(FormData) =', 'AND');
                queryMock.expects('addSort').once().withArgs({ Column: `CAST(FormData ->> \'$.Meta.JCSequenceNumber\' AS ${input.expectedType})`, Direction: 'Ascending'});

                // when
                parse(filterString, queryStub);

                // then
                queryMock.verify();
            });
        });
    });
});
