export class Coordinates {
    constructor(
        public readonly latitude: number,
        public readonly longitude: number,
    ) {
        this.validate();
    }

    private validate(): void {
        if (this.latitude < -90 || this.latitude > 90) {
            throw new Error("Latitude inválida");
        }
        if (this.longitude < -180 || this.longitude > 180) {
            throw new Error("Longitude inválida");
        }
    }
}