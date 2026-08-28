import { Observation } from "@/domain/entities/Observation";
import { Coordinates } from "@/domain/value-objects/Coordinates";

function makeCoords(lat = -20, long = -40) {
    return new Coordinates(lat, long);
}

describe('Observation Entity', () => {
    describe('Contructor', () => {
        it('Should create an observation with valid data', () => {
            const coords = makeCoords();
            const observation = new Observation('id-1', coords, 'file://photo.png');
            expect(observation.id).toBe('id-1')
            expect(observation.coordinates).toBe(coords)
            expect(observation.photo).toBe('file://photo.png')
        })

        it('should throw an error if photo is invalid', () => {
            const coords = makeCoords();
            expect(() => new Observation('id-1', coords, 'invalid')).toThrow('Foto inválida');
        })
    })

    describe('updatePhoto', () => {
        it('Should update photo', () => {
            const coords = makeCoords();
            const observation = new Observation('id-1', coords, 'file://photo.png');
            observation.updatePhoto('file://new-photo.png');
            expect(observation.photo).toBe('file://new-photo.png')
        })

        it('should throw an error if photo is invalid', () => {
            const coords = makeCoords();
            const observation = new Observation('id-1', coords, 'file://photo.png')
            expect(() => observation.updatePhoto('invalid')).toThrow('Foto inválida');
        })
    })
})