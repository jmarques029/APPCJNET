import { Coordinates } from "../value-objects/Coordinates";

export class Observation {
    public readonly id: string;
    public readonly coordinates: Coordinates;
    public photo: string

    constructor(
        id: string,
        coordinates: Coordinates,
        photo: string
    ) {
        this.id = id;
        this.coordinates = coordinates;
        this.photo = photo;
        this.validate();
    }

    private validate(): void {
        if (!this.photo || !this.photo.startsWith('file://')) {
            throw new Error("Foto inválida");
        }
    }
    public updatePhoto(photo: string): void {
        this.photo = photo;
        this.validate();
    }
}