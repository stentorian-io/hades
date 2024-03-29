// @flow strict
/* global ModelFieldsType, TableRowType */
import type { Table } from "./Table";
import type { Model } from "../model/Model";
import type { Schema } from "../model/Schema";
import type { Mutation } from "../objects/Mutation";
import type { EnumEntry } from "../objects/EnumEntry";
import { MutationTypeEnum } from "../objects/enums/MutationTypeEnum";
import { HadesUnexpectedValueError } from "../objects/errors/HadesUnexpectedValueError";

/**
 * @author Daniel van Dijk <daniel@invidiacreative.net>
 * @since 20200718 Initial creation.
 */
class Session {
    _state: StateType;
    _models: Array<Class<Model>>;

    /**
     * @param {StateType} state
     *
     * @returns {void}
     */
    constructor(state: StateType): void {
        this._state = state;
    }

    /**
     * @returns {StateType}
     */
    getState(): StateType {
        return this._state;
    }

    /**
     * @returns {Array<Class<Model>>}
     */
    getModels(): Array<Class<Model>> {
        return this._models;
    }

    /**
     * @param {Array<Class<Model>>} models
     *
     * @returns {void}
     */
    addModels(models: Array<Class<Model>>): void {
        this._models = models;
    }

    /**
     * @param {StateType} object
     *
     * @returns {void}
     */
    mergeIntoState(object: StateType): void {
        Object.assign(this._state, object);
    }

    /**
     * @param {Mutation} mutation
     *
     * @returns {void}
     * @throws {HadesUnexpectedValueError}
     */
    applyMutation(mutation: Mutation): void {
        const type: EnumEntry = mutation.getType();
        const ModelClass: Class<Model> = mutation.getModelClass();
        const pointerModelTableOrNull: Table | null = this._getPointerForModelTableOrNull(
            ModelClass
        );

        if (pointerModelTableOrNull) {
            // Found pointer to model's table.
        } else {
            throw new HadesUnexpectedValueError(
                "Cannot apply mutation to Model without table pointer."
            );
        }

        const modelIdOrNull: number | null = mutation.getModelIdOrNull();
        const willApplyToEntireTable: boolean = mutation.getWillApplyToEntireTable();
        const fieldsOrNull: ModelFieldsType | null = this._getModelFieldsConvertedForMutationOrNull(
            ModelClass,
            mutation.getFieldsOrNull(),
            type.equals(MutationTypeEnum.INSERT())
        );

        if (type.equals(MutationTypeEnum.INSERT())) {
            this._applyInsertMutation(pointerModelTableOrNull, fieldsOrNull);
        } else if (type.equals(MutationTypeEnum.UPSERT())) {
            this._applyUpsertMutation(pointerModelTableOrNull, fieldsOrNull);
        } else if (type.equals(MutationTypeEnum.DELETE())) {
            this._applyDeleteMutation(
                pointerModelTableOrNull,
                modelIdOrNull,
                willApplyToEntireTable
            );
        } else if (type.equals(MutationTypeEnum.UPDATE())) {
            this._applyUpdateMutation(
                pointerModelTableOrNull,
                fieldsOrNull,
                modelIdOrNull
            );
        } else {
            throw new HadesUnexpectedValueError(
                `Unexpected mutation type '${type.getValue()}'.`
            );
        }
    }

    /**
     * @param {Class<Model>} ModelClass
     * @param {TableRowType|null} fieldsOrNull
     * @param {boolean} isIdentifierFieldRequired
     *
     * @returns {ModelFieldsType|null}
     */
    _getModelFieldsConvertedForMutationOrNull(
        ModelClass: Class<Model>,
        fieldsOrNull: TableRowType | null,
        isIdentifierFieldRequired: boolean
    ): ModelFieldsType | null {
        if (fieldsOrNull) {
            const modelSchema: Schema = ModelClass.fields();

            modelSchema.assertSchemaAllowsFieldsForMutation(
                ModelClass,
                fieldsOrNull
            );

            return modelSchema.castValuesAgainstDefinition(
                fieldsOrNull,
                isIdentifierFieldRequired
            );
        } else {
            return null;
        }
    }

    /**
     * @param {Class<Model>} ModelClass
     *
     * @returns {Table|null}
     */
    _getPointerForModelTableOrNull(ModelClass: Class<Model>): Table | null {
        const tableKeyOrNull: string | null = ModelClass.getTableKeyOrNull();

        if (tableKeyOrNull) {
            return this._state[tableKeyOrNull];
        } else {
            return null;
        }
    }

    /**
     * @param {Table} pointerTable
     * @param {number|null} modelIdOrNull
     * @param {boolean} willApplyToEntireTable
     *
     * @returns {void}
     * @throws {HadesUnexpectedValueError}
     */
    _applyDeleteMutation(
        pointerTable: Table,
        modelIdOrNull: number | null,
        willApplyToEntireTable: boolean
    ): void {
        if (willApplyToEntireTable) {
            pointerTable.truncate();
        } else if (modelIdOrNull) {
            pointerTable.deleteRow(modelIdOrNull);
        } else {
            throw new HadesUnexpectedValueError(
                "Model ID cannot be null for DELETE MutationType."
            );
        }
    }

    /**
     * @param {Table} pointerTable
     * @param {ModelFieldsType|null} fieldsOrNull
     *
     * @returns {void}
     * @throws {HadesUnexpectedValueError}
     */
    _applyInsertMutation(
        pointerTable: Table,
        fieldsOrNull: ModelFieldsType | null
    ): void {
        if (fieldsOrNull) {
            pointerTable.insertRow(fieldsOrNull);
        } else {
            throw new HadesUnexpectedValueError(
                "Fields are required for INSERT MutationType."
            );
        }
    }

    /**
     * @param {Table} pointerTable
     * @param {ModelFieldsType|null} fieldsOrNull
     *
     * @returns {void}
     * @throws {HadesUnexpectedValueError}
     */
    _applyUpsertMutation(
        pointerTable: Table,
        fieldsOrNull: ModelFieldsType | null
    ): void {
        if (fieldsOrNull) {
            pointerTable.upsertRow(fieldsOrNull);
        } else {
            throw new HadesUnexpectedValueError(
                "Fields are required for UPSERT MutationType."
            );
        }
    }

    /**
     * @param {Table} pointerTable
     * @param {ModelFieldsType|null} fieldsOrNull
     * @param {number|null} modelIdOrNull
     *
     * @returns {void}
     * @throws {HadesUnexpectedValueError}
     */
    _applyUpdateMutation(
        pointerTable: Table,
        fieldsOrNull: ModelFieldsType | null,
        modelIdOrNull: number | null
    ): void {
        if (fieldsOrNull === null) {
            throw new HadesUnexpectedValueError(
                "Fields are required for UPDATE MutationType."
            );
        } else if (modelIdOrNull === null) {
            throw new HadesUnexpectedValueError(
                "Model ID cannot be null for UPDATE MutationType."
            );
        } else {
            pointerTable.updateRow(modelIdOrNull, fieldsOrNull);
        }
    }
}

export { Session };
