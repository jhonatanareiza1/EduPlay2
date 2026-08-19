import { describe, it, expect } from "vitest";

import {
    syncOfflineOperationsHandler,
} from "../src/functions/sync/syncOfflineOperations";

describe("syncOfflineOperationsHandler", () => {
    it("rechaza una llamada sin autenticación", async () => {
        await expect(
            syncOfflineOperationsHandler(
                {
                    operations: [],
                },
                null,
            ),
        ).rejects.toMatchObject({
            code: "unauthenticated",
        });
    });

    it("rechaza operations que no sea un arreglo", async () => {
        await expect(
            syncOfflineOperationsHandler(
                {
                    operations: "invalid",
                } as unknown as {
                    operations: [];
                },
                {
                    uid: "student-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("permite sincronizar un arreglo vacío", async () => {
        const result =
            await syncOfflineOperationsHandler(
                {
                    operations: [],
                },
                {
                    uid: "student-test-001",
                },
            );

        expect(result).toEqual({
            success: true,
            processed: 0,
            results: [],
        });
    });

    it("rechaza una operación sin operationId", async () => {
        await expect(
            syncOfflineOperationsHandler(
                {
                    operations: [
                        {
                            operationId: "",
                            type: "test",
                            data: {},
                        },
                    ],
                },
                {
                    uid: "student-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("rechaza una operación sin type", async () => {
        await expect(
            syncOfflineOperationsHandler(
                {
                    operations: [
                        {
                            operationId: "operation-001",
                            type: "",
                            data: {},
                        },
                    ],
                },
                {
                    uid: "student-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("rechaza una operación con data inválida", async () => {
        await expect(
            syncOfflineOperationsHandler(
                {
                    operations: [
                        {
                            operationId: "operation-001",
                            type: "test",
                            data: [],
                        },
                    ],
                },
                {
                    uid: "student-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });
});