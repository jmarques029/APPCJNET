import { ObservationRepository } from "@/domain/repositories/ObservationRepository";


export class ListObservations {
    constructor(private readonly repository: ObservationRepository) { }

    public async execute() {
        return await this.repository.findAll();
    }
}