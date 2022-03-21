const chai = require('chai');
const sinon = require('sinon');
const expect = chai.expect;
const assert = chai.assert;

suite('Filter Stanza Parse', () =>
{
    const parse = require('../source/Meadow-Filter').parse;
    let queryStub = { addFilter: () => { } };
    let queryMock;

    setup(() =>
    {
        queryMock = sinon.mock(queryStub);
    });

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
});
