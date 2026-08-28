import { Observation } from "@/domain/entities/Observation";
import { ObservationRepository } from "@/domain/repositories/ObservationRepository";

export class InMemoryObservationRepository implements ObservationRepository {
    private observations: Observation[] = [];
    private static instance: InMemoryObservationRepository
    private constructor() { }

    public static getInstance(): InMemoryObservationRepository {
        if (!InMemoryObservationRepository.instance) {
            InMemoryObservationRepository.instance = new InMemoryObservationRepository();
        }
        return InMemoryObservationRepository.instance;
    }

    async save(observation: Observation): Promise<void> {
        this.observations.push(observation);
    }

    async findById(id: string): Promise<Observation | undefined> {
        return this.observations.find(o => o.id === id);
    }

    async findAll(): Promise<Observation[]> {
        return this.observations;
    }
}