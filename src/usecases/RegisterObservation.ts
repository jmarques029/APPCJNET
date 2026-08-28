import { Observation } from '../domain/entities/Observation'
import { Coordinates } from '../domain/value-objects/Coordinates'
import { ObservationRepository } from '../domain/repositories/ObservationRepository'

export interface RegisterObservationDTO {
    photo: string;
    latitude: number;
    longitude: number;
}

export class RegisterObservation {
    constructor(
        private readonly repository: ObservationRepository
    ) { }

    public async execute(input: RegisterObservationDTO) {
        const coordinates = new Coordinates(input.latitude, input.longitude)
        const observation = new Observation(
            Date.now().toString() + Math.random().toString(36).substring(2, 9),
            coordinates,
            input.photo
        )
        await this.repository.save(observation);
        return observation;
    }
}