/*
 * Copyright (c) 2010-2020 SAP and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 *
 * Contributors:
 *   SAP - initial API and implementation
 */
(function () {
	"use strict";

	let BoardVotesORM = {
		table: "DIRIGIBLE_DISCUSSIONS_BOARD_VOTE",
		properties: [
			{
				name: "id",
				column: "DISV_ID",
				id: true,
				required: true,
				type: "BIGINT"
			}, {
				name: "boardId",
				column: "DISV_DISB_ID",
				required: true,
				type: "BIGINT"
			}, {
				name: "user",
				column: "DISV_USER",
				required: true,
				type: "VARCHAR",
				size: 100
			}, {
				name: "vote",
				column: "DISV_VOTE",
				required: true,
				type: "SMALLINT"
			}
		]
	};

	let DAO = require('db/v4/dao').DAO;
	let BoardVotesDAO = exports.BoardVotesDAO = function (orm) {
		orm = orm || BoardVotesORM;
		DAO.call(this, orm, 'BoardVotesDAO');
	};
	BoardVotesDAO.prototype = Object.create(DAO.prototype);
	BoardVotesDAO.prototype.constructor = BoardVotesDAO;

	BoardVotesDAO.prototype.getVote = function (boardId, user) {
		let voteEntity = this.list({
			boardId: boardId,
			user: user
		})[0];
		let vote = 0;
		if (voteEntity)
			vote = voteEntity.vote;
		return vote;
	};

	//upsert
	BoardVotesDAO.prototype.vote = function (boardId, user, vote) {
		//First check that the user is not the board author: authors are not allowed to vote their own boards.
		let boardDao = require("ide-discussions/lib/board_dao").create();
		let board = boardDao.find(boardId, undefined, ['user']);
		if (!board)
			throw Error('Illegal argument: no records for boardId[' + boardId + ']');
		if (board.user === user)
			throw Error('Illegal argument: user[' + user + '] is not eligible to vote because is the board author');

		boardId = parseInt(boardId, 10);
		vote = parseInt(vote, 10);

		let previousVote = this.list({
			boardId: boardId,
			user: user
		})[0];
		if (previousVote === undefined || previousVote === null || previousVote === 0) {
			//Operations is INSERT
			this.$log.info("Inserting {} relation between DIS_BOARD[{}] and IAM_USER[{}]", this.orm.table, boardId, user);
			this.insert({
				vote: vote,
				boardId: boardId,
				user: user
			});
		} else {
			//Operations is UPDATE
			let params = {};
			params[this.orm.getPrimaryKey().name] = previousVote[this.orm.getPrimaryKey().name];
			params['vote'] = vote;
			params['boardId'] = boardId;
			params['user'] = user;
			this.update(params);
		}
	};

	exports.create = exports.get = function (orm) {
		return new BoardVotesDAO(orm || BoardVotesORM);
	};

})();