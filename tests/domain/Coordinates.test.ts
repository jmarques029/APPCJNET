import { Coordinates } from "@/domain/value-objects/Coordinates";

describe("Coordinates Value Object", () => {
    it("should create a valid coordinate", () => {
        const coordinates = new Coordinates(10, 20);
        expect(coordinates).toBeInstanceOf(Coordinates);
        expect(coordinates.latitude).toBe(10);
        expect(coordinates.longitude).toBe(20);
    });

    it("should throw an error for invalid latitude", () => {
        expect(() => new Coordinates(100, 20)).toThrow("Latitude inválida");
    });

    it("should throw an error for invalid longitude", () => {
        expect(() => new Coordinates(10, 200)).toThrow("Longitude inválida");
    });
});
