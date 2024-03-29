// @flow strict
/* global TableRowType */
import type { Schema } from "./Schema";
import { Mutation } from "../objects/Mutation";
import type { Table } from "../database/Table";
import type { Session } from "../database/Session";
import { MutationTypeEnum } from "../objects/enums/MutationTypeEnum";
import { HadesValidationError } from "../objects/errors/HadesValidationError";

/**
 * @author Daniel van Dijk <daniel@invidiacreative.net>
 * @since 20200718 Initial creation.
 */
class Model {
    _session: Session;
    _tableKey: string;
    _fields: ModelFieldsType;
    _ModelClass: Class<Model>;
    _modelId: ModelIdentifierType;
    _identifierKey: ModelIdentifierType;

    static session: Session;
    static tableKey: string;
    static identifierKey: ModelIdentifierType;

    static fields: () => Schema;
    static toString: () => string;
    static reducer: (action: ActionType) => void;

    /**
     * @param {Class<Model>} ModelClass
     * @param {ModelIdentifierType} modelId
     *
     * @returns {void}
     */
    constructor(ModelClass: Class<Model>, modelId: ModelIdentifierType): void {
        this._modelId = modelId;
        this._ModelClass = ModelClass;
        this._session = this._ModelClass.session;
        this._tableKey = this._ModelClass.tableKey;
        this._identifierKey = this._ModelClass.identifierKey;

        const tableOrNull: Table | null = this._getTableInstanceOrNull();

        if (tableOrNull === null) {
            throw new HadesValidationError(
                "Cannot get Model instance with missing Table."
            );
        } else {
            // TODO: For now we'll have to referece _rows directly if we want
            // to maintain all constructed field class instances.
            const tableRowsOrNull: Model | null =
                tableOrNull._rows[this._modelId] ?? null;

            if (tableRowsOrNull === null) {
                throw new HadesValidationError(
                    `No data exists for Model instance with ID '${modelId}'.`
                );
            } else {
                this._fields = tableRowsOrNull;
            }
        }
    }

    /**
     * @param {TableRowType} fields
     *
     * @returns {void}
     */
    update(fields: TableRowType): void {
        this._session.applyMutation(
            new Mutation({
                fields,
                ModelClass: this._ModelClass,
                type: MutationTypeEnum.UPDATE(),
                modelId: this._fields[this._identifierKey],
            })
        );
    }

    /**
     * @returns {void}
     */
    delete(): void {
        this._session.applyMutation(
            new Mutation({
                ModelClass: this._ModelClass,
                type: MutationTypeEnum.DELETE(),
                modelId: this._fields[this._identifierKey],
            })
        );
    }

    /**
     * @param {TableRowType} fields
     *
     * @returns {void}
     */
    static create(fields: TableRowType): void {
        this.session.applyMutation(
            new Mutation({
                fields,
                ModelClass: this,
                type: MutationTypeEnum.INSERT(),
            })
        );
    }

    /**
     * @param {TableRowType} fields
     *
     * @returns {void}
     */
    static upsert(fields: TableRowType): void {
        this.session.applyMutation(
            new Mutation({
                fields,
                ModelClass: this,
                type: MutationTypeEnum.UPSERT(),
            })
        );
    }

    /**
     * @returns {void}
     */
    static deleteAll(): void {
        this.session.applyMutation(
            new Mutation({
                ModelClass: this,
                willApplyToEntireTable: true,
                type: MutationTypeEnum.DELETE(),
            })
        );
    }

    /**
     * @param {ModelIdentifierType} modelId
     *
     * @returns {Model}
     */
    static withId(modelId: ModelIdentifierType): Model {
        return new Model(this, modelId);
    }

    /**
     * @returns {string|null}
     */
    static getTableKeyOrNull(): string | null {
        return this.tableKey || null;
    }

    /**
     * @param {string} tableKey
     *
     * @returns {void}
     */
    static addTableKey(tableKey: string): void {
        this.tableKey = tableKey;
    }

    /**
     * @param {ModelIdentifierType} identifierKey
     *
     * @returns {void}
     */
    static addIdentifierKey(identifierKey: ModelIdentifierType): void {
        this.identifierKey = identifierKey;
    }

    /**
     * @param {Session} session
     *
     * @returns {void}
     */
    static addSession(session: Session): void {
        this.session = session;
    }

    /**
     * @returns {Table|null}
     */
    _getTableInstanceOrNull(): Table | null {
        return this?._session.getState()[this._tableKey ?? ""] || null;
    }
}

export { Model };
