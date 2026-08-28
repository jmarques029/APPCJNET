import { Observation } from '../entities/Observation'

export interface ObservationRepository {
    save(observation: Observation): Promise<void>
    findById(id: string): Promise<Observation | undefined>
    findAll(): Promise<Observation[]>
}